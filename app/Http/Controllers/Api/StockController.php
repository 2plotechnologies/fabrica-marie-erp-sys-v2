<?php

namespace App\Http\Controllers\Api;

use App\Models\StockActual;
use App\Models\StockVendedor;
use App\Models\Salida;

class StockController extends Controller
{
    public function index()
    {
        return response()->json(
            StockActual::with(['producto', 'ruma'])->get()
        );
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
