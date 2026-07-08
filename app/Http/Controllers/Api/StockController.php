<?php

namespace App\Http\Controllers\Api;

use App\Models\Producto;
use App\Models\StockVendedor;
use App\Models\Salida;

class StockController extends Controller
{
    public function index()
    {
        $stock = Producto::query()
            ->whereHas('stock', function ($query) {
                $query->whereNotNull('ruma_id');
            })
            ->with(['stock.ruma:id,codigo,nombre,capacidad_unidades'])
            ->get()
            ->map(function ($producto) {
                $stocksPorRuma = $producto->stock
                    ->filter(fn ($stock) => !is_null($stock->ruma_id))
                    ->map(function ($stock) {
                        return [
                            'id' => $stock->ruma?->id,
                            'codigo' => $stock->ruma?->codigo,
                            'nombre' => $stock->ruma?->nombre,
                            'capacidad_unidades' => (int) ($stock->ruma?->capacidad_unidades ?? 0),
                            'cantidad' => (int) $stock->cantidad,
                        ];
                    })
                    ->values();

                return [
                    'id' => $producto->id,
                    'producto_id' => $producto->id,
                    'cantidad' => (int) $stocksPorRuma->sum('cantidad'),
                    'capacidad_total' => (int) $stocksPorRuma->sum('capacidad_unidades'),
                    'stock_minimo' => (int) ($producto->stock_minimo ?? 0),
                    'producto' => $producto,
                    'rumas' => $stocksPorRuma,
                ];
            })
            ->values();

        return response()->json($stock);
    }

    public function stockVendedores()
    {
        $salidas = Salida::where('estado', 'EN_RUTA')
            ->with(['items'])
            ->get();

        $salidaIds = $salidas->pluck('id');

        $stock = StockVendedor::with(['producto', 'vendedor.usuario', 'salida.items'])
            ->whereIn('salida_id', $salidaIds)
            ->get();

        // calcular cantidad despachada
        foreach ($stock as $item) {

            $cantidadDespachada = $item->salida->items
                ->where('producto_id', $item->producto_id)
                ->sum('cantidad');

            $item->cantidad_despachada = $cantidadDespachada;
        }

        return response()->json($stock);
    }

    public function transferirStock(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'origen_vendedor_id' => 'required|exists:vendedores,id',
            'destino_vendedor_id' => 'required|exists:vendedores,id|different:origen_vendedor_id',
        ]);

        $origenId = $request->origen_vendedor_id;
        $destinoId = $request->destino_vendedor_id;

        $salidas = Salida::where('estado', 'EN_RUTA')->pluck('id');

        $stockParaTransferir = StockVendedor::where('vendedor_id', $origenId)
            ->whereIn('salida_id', $salidas)
            ->where('cantidad', '>', 0)
            ->get();

        if ($stockParaTransferir->isEmpty()) {
            return response()->json(['error' => 'No hay stock disponible para transferir'], 400);
        }

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            foreach ($stockParaTransferir as $item) {
                $cantidadTransferida = $item->cantidad;

                $stockDestino = StockVendedor::where('vendedor_id', $destinoId)
                    ->where('salida_id', $item->salida_id)
                    ->where('producto_id', $item->producto_id)
                    ->first();

                if ($stockDestino) {
                    $stockDestino->cantidad += $cantidadTransferida;
                    $stockDestino->cantidad_entregada += $cantidadTransferida;
                    $stockDestino->save();
                } else {
                    StockVendedor::create([
                        'producto_id' => $item->producto_id,
                        'vendedor_id' => $destinoId,
                        'salida_id' => $item->salida_id,
                        'cantidad' => $cantidadTransferida,
                        'cantidad_entregada' => $cantidadTransferida,
                        'stock_reservado' => 0,
                        'vendido' => 0,
                        'devuelto' => 0,
                        'fecha_ultimo_mov' => now()
                    ]);
                }

                $item->cantidad_entregada -= $cantidadTransferida;
                $item->cantidad = 0;
                $item->fecha_ultimo_mov = now();
                $item->save();

                $salidaItem = \App\Models\SalidaItem::where('salida_id', $item->salida_id)
                    ->where('producto_id', $item->producto_id)
                    ->first();

                if ($salidaItem) {
                    \App\Services\StockService::registrarMovimiento([
                        'tipo' => 'TRANSFERENCIA_VENDEDOR',
                        'producto_id' => $item->producto_id,
                        'ruma_id' => $salidaItem->ruma_id,
                        'cantidad' => $cantidadTransferida,
                        'referencia_tipo' => 'VENDEDOR',
                        'referencia_id' => $destinoId,
                        'motivo' => "Transferencia de mercancia de vendedor ID {$origenId} a vendedor ID {$destinoId}",
                        'user_id' => auth()->id()
                    ]);
                }
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json(['message' => 'Stock transferido exitosamente']);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                'error' => 'Error al transferir stock',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}
