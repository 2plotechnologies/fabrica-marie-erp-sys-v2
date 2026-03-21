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
}
