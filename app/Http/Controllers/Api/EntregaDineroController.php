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
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();

        $query = EntregaDinero::with('usuario', 'items');

        if ($isVendedor) {
            $query->where('usuario_id', $user->id);
        }

        $entregas = $query->orderBy('created_at', 'desc')->get();
        return response()->json($entregas);
    }

    private function obtenerCalculoVendedor($usuarioId, $vendedorId)
    {
        // 🔹 Identificar la salida en ruta actual del vendedor
        $salidaActual = \App\Models\Salida::where('vendedor_id', $vendedorId)
            ->whereIn('estado', ['EN_RUTA', 'PENDIENTE'])
            ->orderBy('id', 'desc')
            ->first();

        if (!$salidaActual) {
            $salidaActual = \App\Models\Salida::where('vendedor_id', $vendedorId)
                ->whereDate('fecha', \Carbon\Carbon::today())
                ->orderBy('id', 'desc')
                ->first();
        }

        $salidaId = $salidaActual ? $salidaActual->id : null;
        $fechaSalida = $salidaActual ? $salidaActual->fecha : \Carbon\Carbon::today()->format('Y-m-d');

        // 1. Ventas contado confirmadas de la salida actual
        $ventasContadoQuery = \App\Models\Venta::where('vendedor_id', $vendedorId)
            ->where('estado', 'CONFIRMADA')
            ->where('tipo_pago', 'CONTADO');

        if ($salidaId) {
            $ventasContadoQuery->where(function ($q) use ($salidaId, $fechaSalida) {
                $q->whereHas('items', function ($iq) use ($salidaId) {
                    $iq->where('salida_id', $salidaId);
                })->orWhereDate('fecha', '>=', $fechaSalida);
            });
        } else {
            $ventasContadoQuery->whereDate('fecha', '>=', $fechaSalida);
        }
        $ventasContado = (float) $ventasContadoQuery->sum('total_neto');

        // 2. Adelantos de ventas crédito confirmadas de la salida actual
        $adelantosCreditoQuery = \App\Models\Venta::where('vendedor_id', $vendedorId)
            ->where('estado', 'CONFIRMADA')
            ->where('tipo_pago', 'CREDITO');

        if ($salidaId) {
            $adelantosCreditoQuery->where(function ($q) use ($salidaId, $fechaSalida) {
                $q->whereHas('items', function ($iq) use ($salidaId) {
                    $iq->where('salida_id', $salidaId);
                })->orWhereDate('fecha', '>=', $fechaSalida);
            });
        } else {
            $adelantosCreditoQuery->whereDate('fecha', '>=', $fechaSalida);
        }
        $adelantosCredito = (float) $adelantosCreditoQuery->sum('adelanto');

        // 3. Cobranzas (Abonos) asociadas a la salida actual
        $cobranzas = (float) \App\Models\Abono::where(function ($q) use ($usuarioId, $vendedorId) {
                $q->where('usuario_id', $usuarioId)
                  ->orWhereHas('cuenta.venta', function ($qVenta) use ($vendedorId) {
                      $qVenta->where('vendedor_id', $vendedorId);
                  });
            })
            ->where(function ($q) {
                $q->where('estado', '!=', 'ANULADO')
                  ->orWhereNull('estado');
            })
            ->whereDate('fecha', '>=', $fechaSalida)
            ->sum('monto');

        // 4. Gastos del vendedor en la salida actual (no rechazados)
        $gastos = (float) \App\Models\Gasto::where('vendedor_id', $vendedorId)
            ->where('estado', '!=', 'RECHAZADO')
            ->whereDate('fecha', '>=', $fechaSalida)
            ->sum('monto');

        // 5. Entregas de dinero previas realizadas en la salida actual (pendientes o aceptadas)
        $entregasPrevias = (float) \App\Models\EntregaDinero::where('usuario_id', $usuarioId)
            ->whereIn('estado', ['PENDIENTE', 'ACEPTADA'])
            ->whereDate('created_at', '>=', $fechaSalida)
            ->sum('monto_total');

        $totalRecabado = $ventasContado + $adelantosCredito + $cobranzas;
        $totalDisponible = max(0, $totalRecabado - $gastos - $entregasPrevias);

        return [
            'vendedor_id' => $vendedorId,
            'salida_id' => $salidaId,
            'salida_fecha' => $fechaSalida,
            'ventas_contado' => $ventasContado,
            'adelantos_credito' => $adelantosCredito,
            'cobranzas' => $cobranzas,
            'gastos' => $gastos,
            'entregas_previas' => $entregasPrevias,
            'total_recabado' => $totalRecabado,
            'total_disponible' => $totalDisponible,
            'total_ventas_confirmadas' => $totalRecabado
        ];
    }

    public function resumenVendedor()
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json([
                'total_recabado' => 0,
                'total_disponible' => 0,
                'total_ventas_confirmadas' => 0
            ]);
        }

        $vendedor = \App\Models\Vendedor::where('usuario_id', $user->id)->first();
        if (!$vendedor) {
            return response()->json([
                'total_recabado' => 0,
                'total_disponible' => 0,
                'total_ventas_confirmadas' => 0
            ]);
        }

        return response()->json($this->obtenerCalculoVendedor($user->id, $vendedor->id));
    }

    public function store(Request $request)
    {
        $request->validate([
            'usuario_id' => 'required|exists:usuarios,id',
            'nombre_receptor' => 'nullable|string|max:255',
            'monto_total' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string',
            'fecha' => 'nullable|date',
            'items' => 'required|array|min:1',

            'items.*.metodo_pago' => 'required|string',
            'items.*.monto' => 'required|numeric|min:0',
            'items.*.comprobante' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:2048'
        ]);

        $targetUser = \App\Models\Usuario::with('roles')->find($request->usuario_id);
        $isVendedor = $targetUser && $targetUser->roles()->where('nombre', 'VENDEDOR')->exists();

        if ($isVendedor) {
            $vendedor = \App\Models\Vendedor::where('usuario_id', $request->usuario_id)->first();
            if ($vendedor) {
                $calculo = $this->obtenerCalculoVendedor($request->usuario_id, $vendedor->id);

                if ($request->monto_total > $calculo['total_disponible']) {
                    abort(422, 'El monto a entregar (S/ ' . number_format($request->monto_total, 2) . ') excede el saldo disponible de ventas y cobranzas del vendedor (S/ ' . number_format($calculo['total_disponible'], 2) . ').');
                }
            }
        }

        return DB::transaction(function () use ($request) {
            $fechaEntrega = $request->fecha ? \Carbon\Carbon::parse($request->fecha)->setTimeFrom(now()) : now();

            // 🔹 Crear la entrega principal
            $entrega = EntregaDinero::create([
                'usuario_id' => $request->usuario_id,
                'nombre_receptor' => $request->nombre_receptor,
                'created_at' => $fechaEntrega,
                'monto_total' => $request->monto_total,
                'observaciones' => $request->observaciones,
                'estado' => 'PENDIENTE'
            ]);

            // 🔹 Procesar items
            foreach ($request->items as $index => $item) {

                // 📁 Obtener archivo opcional
                $file = $request->file("items.$index.comprobante");
                $path = null;

                if ($file) {
                    $path = $file->store('comprobantes_entregas', 'public');
                }

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
            $entrega = EntregaDinero::with('usuario.roles')->findOrFail($id);
            
            if ($request->estado === 'ACEPTADA') {
                $observacionSistema = '';
                $isVendedor = $entrega->usuario && $entrega->usuario->roles()->where('nombre', 'VENDEDOR')->exists();
                
                if ($isVendedor) {
                    $observacionSistema = '[SISTEMA] Entrega de vendedor aprobada (sin afectación de caja central).';
                } else {
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