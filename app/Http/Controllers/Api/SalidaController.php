<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Salida;
use App\Models\SalidaItem;
use App\Models\StockVendedor;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

class SalidaController
{
    public function index()
    {
        $salidas = Salida::with([
            'vendedor.usuario',
            'vehiculo',
            'ruta',
            'items.producto',
            'items.ruma'
        ])->orderBy('fecha', 'desc')->get();

        return response()->json($salidas);
    }

    public function show($id)
    {
        $salida = Salida::with([
            'vendedor.usuario',
            'vehiculo',
            'ruta',
            'items.producto',
            'items.ruma'
        ])->findOrFail($id);

        return response()->json($salida);
    }

    public function store(Request $request)
    {
        $request->validate([
            'fecha' => 'required|date',
            'vendedor_id' => 'required|exists:vendedores,id',
            'vehiculo_id' => 'required|exists:vehiculos,id',
            'ruta_id' => 'required|exists:rutas,id',
            'zona' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.ruma_id' => 'required|exists:rumas,id',
            'items.*.cantidad' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();

        try {

            $salida = Salida::create([
                'fecha' => $request->fecha,
                'vendedor_id' => $request->vendedor_id,
                'conductor' => $request->conductor,
                'vehiculo_id' => $request->vehiculo_id,
                'zona' => $request->zona,
                'ruta_id' => $request->ruta_id,
                'estado' => 'PENDIENTE'
            ]);

            foreach ($request->items as $item) {
                SalidaItem::create([
                    'salida_id' => $salida->id,
                    'producto_id' => $item['producto_id'],
                    'ruma_id' => $item['ruma_id'],
                    'cantidad' => $item['cantidad'],
                ]);

                StockVendedor::create([
                    'salida_id' => $salida->id,
                    'producto_id' => $item['producto_id'],
                    'vendedor_id' => $request->vendedor_id,
                    'cantidad' => $item['cantidad'],
                ]);

                StockService::registrarMovimiento([
                    'tipo' => 'SALIDA',
                    'producto_id' => $item['producto_id'],
                    'ruma_id' => $item['ruma_id'],
                    'cantidad' => $item['cantidad'],
                    'motivo' => 'Despacho de fabrica. Salida #' . $salida->id,
                    'user_id' => auth()->id() // null por ahora si no hay auth
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Salida creada correctamente',
                'salida' => $salida->load('items.producto', 'items.ruma')
            ], 201);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'error' => 'Error al crear salida',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function updateEstado(Request $request, $id){
        $request->validate([
            'estado' => 'required|in:PENDIENTE,EN_RUTA,COMPLETADO'
        ]);
        $salida = Salida::findOrFail($id);
        $salida->estado = $request->estado;
        $salida->save();

        return response()->json(['message' => 'Estado Actualizado']);
    }
}
