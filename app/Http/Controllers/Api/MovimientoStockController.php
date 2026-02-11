<?php

namespace App\Http\Controllers\Api;

use App\Models\MovimientoStock;
use App\Services\StockService;
use Illuminate\Http\Request;

class MovimientoStockController extends Controller
{
    public function index()
    {
        return response()->json(
            MovimientoStock::with(['producto', 'ruma'])
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'tipo' => 'required|in:INGRESO,SALIDA,AJUSTE,DEVOLUCION',
            'producto_id' => 'required|integer',
            'ruma_id' => 'required|integer',
            'cantidad' => 'required|integer|min:1',
            'motivo' => 'nullable|string'
        ]);

        try {
            $movimiento = StockService::registrarMovimiento([
                'tipo' => $request->tipo,
                'producto_id' => $request->producto_id,
                'ruma_id' => $request->ruma_id,
                'cantidad' => $request->cantidad,
                'motivo' => $request->motivo,
                'user_id' => auth()->id() // null por ahora si no hay auth
            ]);

            return response()->json($movimiento, 201);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function kardex(Request $request, $productoId)
    {
        $query = \App\Models\MovimientoStock::where('producto_id', $productoId)
            ->orderBy('created_at', 'asc');

        // Filtro opcional por fechas
        if ($request->filled('desde')) {
            $query->whereDate('created_at', '>=', $request->desde);
        }

        if ($request->filled('hasta')) {
            $query->whereDate('created_at', '<=', $request->hasta);
        }

        $movimientos = $query->get()->map(function ($mov) {
            return [
                'fecha' => $mov->created_at,
                'tipo' => $mov->tipo,
                'ingreso' => in_array($mov->tipo, ['INGRESO','DEVOLUCION']) ? $mov->cantidad : 0,
                'salida' => in_array($mov->tipo, ['SALIDA']) ? $mov->cantidad : 0,
                'stock' => $mov->stock_post_mov,
                'motivo' => $mov->motivo,
                'usuario_id' => $mov->user_id
            ];
        });

        return response()->json($movimientos);
    }

    public function kardexValorizado($productoId)
    {
        $movimientos = \App\Models\MovimientoStock::with('producto')
            ->where('producto_id', $productoId)
            ->orderBy('created_at', 'asc')
            ->get();

        $saldoValor = 0;

        $kardex = $movimientos->map(function ($mov) use (&$saldoValor) {

            $precio = $mov->producto->precio_base;
            $ingreso = in_array($mov->tipo, ['INGRESO','DEVOLUCION']) ? $mov->cantidad : 0;
            $salida  = $mov->tipo === 'SALIDA' ? $mov->cantidad : 0;

            $ingresoValor = $ingreso * $precio;
            $salidaValor  = $salida * $precio;

            $saldoValor += $ingresoValor - $salidaValor;

            return [
                'fecha' => $mov->created_at,
                'tipo' => $mov->tipo,
                'ingreso' => $ingreso,
                'salida' => $salida,
                'stock' => $mov->stock_post_mov,
                'precio_unitario' => $precio,
                'ingreso_valor' => $ingresoValor,
                'salida_valor' => $salidaValor,
                'saldo_valor' => $saldoValor,
                'motivo' => $mov->motivo
            ];
        });

        return response()->json($kardex);
    }
}
