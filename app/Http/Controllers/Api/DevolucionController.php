<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Devolucion;
use App\Models\MovimientoStock;
use App\Models\StockVendedor;
use App\Services\DevolucionService;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

class DevolucionController
{

  public function __construct(DevolucionService $devolucionService)
 {
    $this->devolucionService = $devolucionService;
 }

    public function index()
    {
        $devoluciones = Devolucion::with([
            'vendedor.usuario',
            'items.producto',
        ])->orderBy('fecha', 'desc')->get();

        return response()->json($devoluciones);
    }

    public function show($id)
    {
        $devolucion = Devolucion::with([
            'items.producto',
        ])->findOrFail($id);

        return response()->json($devolucion);
    }

    public function store(Request $request)
    {
        $request->validate([
            'fecha' => 'required|date',
            'vendedor_id' => 'required|exists:vendedores,id',
            'tipo' => 'required|in:BUENA,MALA',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1'
        ]);

        $devolucion = $this->devolucionService->registrar($request->all());

        return response()->json([
            'message' => 'Devolución registrada correctamente',
            'data' => $devolucion
        ]);
    }

    public function updateEstado(Request $request, $id)
    {
        $request->validate([
            'estado' => 'required|in:RECHAZADA,ACEPTADA'
        ]);

        return DB::transaction(function () use ($request, $id) {

            $devolucion = Devolucion::with('items')->findOrFail($id);

            // Si ya está procesada, evitar reprocesar
            if ($devolucion->estado !== 'PENDIENTE') {
                throw new \Exception("La devolución ya fue procesada.");
            }

            $devolucion->estado = $request->estado;
            $devolucion->save();

            // 🔥 SOLO SI ES ACEPTADA SE MUEVE STOCK
            if ($request->estado === 'ACEPTADA') {

                foreach ($devolucion->items as $item) {

                    $rumaId = MovimientoStock::obtenerUltimaRumaSalida($item->producto_id);

                    $stockVendedor = StockVendedor::where('producto_id', $item->producto_id)
                    ->where('vendedor_id', $devolucion->vendedor_id)
                    ->first();

                    if (!$rumaId) {
                        throw new \Exception("No se encontró ruma previa para el producto {$item->producto_id}");
                    }

                    if ($devolucion->tipo === 'BUENA') {

                        $stockVendedor->devuelto += $item->cantidad;
                        $stockVendedor->save();

                        app(StockService::class)->registrarMovimiento([
                            'tipo' => 'DEVOLUCION_BUENA',
                            'producto_id' => $item->producto_id,
                            'ruma_id' => $rumaId,
                            'cantidad' => $item->cantidad,
                            'referencia_tipo' => 'DEV_ALMACEN',
                            'referencia_id' => $devolucion->id,
                            'motivo' => 'Devolución buena aceptada'
                        ]);

                    } else {

                        $stockVendedor->devuelto += $item->cantidad;
                        $stockVendedor->save();

                        app(StockService::class)->registrarMovimiento([
                            'tipo'=> 'DEVOLUCION_MALA',
                            'producto_id'=> $item->producto_id,
                            'ruma_id' => $rumaId,
                            'cantidad'=> $item->cantidad,
                            'referenciaTipo'=> 'DEV_DANADA',
                            'referenciaId'=> $devolucion->id,
                            'motivo'=> 'Devolución dañada aceptada'
                        ]);
                    }
                }
            }

            return response()->json([
                'message' => 'Estado actualizado correctamente'
            ]);
        });
    }
}
