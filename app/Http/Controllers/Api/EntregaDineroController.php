<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\EntregaDinero;
use App\Models\EntregaDineroItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class EntregaDineroController
{
    public function index()
    {
        $entregas = EntregaDinero::with('usuario', 'items')
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($entregas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'usuario_id' => 'required|exists:usuarios,id',
            'monto_total' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string',
            'items' => 'required|array|min:1',

            'items.*.metodo_pago' => 'required|string',
            'items.*.monto' => 'required|numeric|min:0',
            'items.*.comprobante' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048'
        ]);

        return DB::transaction(function () use ($request) {

            // 🔹 Crear la entrega principal
            $entrega = EntregaDinero::create([
                'usuario_id' => $request->usuario_id,
                'created_at' => now(),
                'monto_total' => $request->monto_total,
                'observaciones' => $request->observaciones,
                'estado' => 'PENDIENTE'
            ]);

            // 🔹 Procesar items
            foreach ($request->items as $index => $item) {

                // 📁 Obtener archivo
                $file = $request->file("items.$index.comprobante");

                if (!$file) {
                    throw new \Exception("El comprobante es obligatorio en todos los items.");
                }

                // 📁 Guardar archivo en storage
                $path = $file->store('comprobantes_entregas', 'public');

                // 🔹 Crear item
                EntregaDineroItem::create([
                    'entrega_id' => $entrega->id,
                    'metodo_pago' => $item['metodo_pago'],
                    'monto' => $item['monto'],
                    'comprobante_path' => $path,
                ]);
            }

            return response()->json([
                'message' => 'Entrega registrada correctamente',
                'data' => $entrega->load('items')
            ], 201);
        });
    }

    public function show($id)
    {
        $entrega = EntregaDinero::with('usuario', 'items')->findOrFail($id);
        return response()->json($entrega);
    }

    public function reporte(Request $request)
    {
        $query = EntregaDinero::with('usuario.roles', 'items');

        if ($request->filled('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        $entregas = $query->orderBy('created_at', 'desc')->get();

        return response()->json($entregas);
    }

    public function updateEstado(Request $request, $id)
    {
        $request->validate([
            'estado' => 'required|in:RECHAZADA,ACEPTADA',
            'confirmar_cierre_irregular' => 'nullable|boolean'
        ]); 
        
        return DB::transaction(function () use ($request, $id) {
            $entrega = EntregaDinero::findOrFail($id);
            
            if ($request->estado === 'ACEPTADA') {
                $observacionSistema = '';
                $cajaAbierta = \App\Models\Caja::whereDate('fecha', now())->where('estado', 'ABIERTA')->first();
                
                if ($cajaAbierta) {
                    try {
                        \App\Services\CajaService::registrarMovimiento([
                            'tipo' => 'EGRESO',
                            'estado' => 'APROBADO',
                            'monto' => $entrega->monto_total,
                            'categoria' => 'ENTREGA DINERO',
                            'descripcion' => 'Aprobación de entrega de dinero #' . $entrega->id,
                            'referencia_tipo' => get_class($entrega),
                            'referencia_id' => $entrega->id,
                        ]);
                        $observacionSistema = '[SISTEMA] El monto se registró automáticamente como un egreso en la caja abierta.';
                    } catch (\Exception $e) {
                        // Thrown by registrarMovimiento if balance is insufficient
                        abort(422, $e->getMessage());
                    }
                } else {
                    $ultimoCierre = \App\Models\CierreCaja::orderBy('id', 'desc')->first();
                    
                    if (!$ultimoCierre) {
                        abort(422, 'No hay cierres de caja registrados para validar los fondos.');
                    }
                    
                    if ($entrega->monto_total > $ultimoCierre->conteo_real) {
                        abort(422, 'El monto de la entrega (S/ ' . number_format($entrega->monto_total, 2) . ') excede el conteo real del último cierre de caja (S/ ' . number_format($ultimoCierre->conteo_real, 2) . ').');
                    }
                    
                    if ($ultimoCierre->estado !== 'CUADRADO' && !$request->boolean('confirmar_cierre_irregular')) {
                        return response()->json([
                            'warning' => true,
                            'message' => 'El último cierre de caja tiene un estado de ' . $ultimoCierre->estado . '. ¿Desea continuar de todos modos con la aprobación?'
                        ], 409);
                    }
                    
                    if ($ultimoCierre->estado !== 'CUADRADO') {
                        $observacionSistema = '[SISTEMA] Entrega aprobada con caja cerrada sin cuadrar (Estado: ' . $ultimoCierre->estado . ').';
                    } else {
                        $observacionSistema = '[SISTEMA] Entrega aprobada con caja cerrada.';
                    }
                }
                
                if ($observacionSistema !== '') {
                    $entrega->observaciones = $entrega->observaciones 
                        ? $entrega->observaciones . "\n" . $observacionSistema 
                        : $observacionSistema;
                }
            }
            
            $entrega->estado = $request->estado;
            $entrega->recibido_by = auth()->id();
            $entrega->aprobado_at = now();
            $entrega->save();
            return response()->json($entrega);
        });
    }
}