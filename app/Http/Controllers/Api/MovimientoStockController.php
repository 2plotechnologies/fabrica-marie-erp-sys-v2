<?php

namespace App\Http\Controllers\Api;

use App\Models\MovimientoStock;
use App\Services\StockService;
use Illuminate\Http\Request;
use App\Models\Ruma;
use App\Models\StockActual;

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
            'tipo' => 'required|in:INGRESO,SALIDA,AJUSTE,DEVOLUCION_BUENA,DEVOLUCION_MALA,DESECHO',
            'producto_id' => 'required|integer',
            'ruma_id' => 'required|integer',
            'cantidad' => 'required|integer|min:1',
            'motivo' => 'nullable|string'
        ]);

        //No permitir que se pueda registrar en una ruma en mantenimiento o inactiva.
        $ruma = Ruma::find($request->ruma_id);
        if ($ruma->estado === 'INACTIVA' || $ruma->estado === 'MANTENIMIENTO') {
            return response()->json([
                'message' => 'No se puede registrar en una ruma en mantenimiento o inactiva.'
            ], 422);
        }

        //Si el tipo es INGRESO O DEVOLUCION_BUENA, verificar que la ruma no esté llena
        if($request->tipo == 'INGRESO' || $request->tipo == 'DEVOLUCION_BUENA'){
            $ruma = Ruma::find($request->ruma_id);
            if($ruma->estado == 'LLENA'){
                return response()->json([
                    'message' => 'No se puede registrar en una ruma llena.'
                ], 422);
            }
        }

        //No permitir que se ingrese mas cantidad de la que queda en la ruma si el tipo es INGRESO O DEVOLUCION_BUENA
        if($request->tipo == 'INGRESO' || $request->tipo == 'DEVOLUCION_BUENA'){
            $ruma = Ruma::find($request->ruma_id);
            //La ruma no tiene el campo cantidad, se debe buscar en StockActual con el id de la ruma.
            $stockActual = StockActual::where('ruma_id', $request->ruma_id);
            //Sumar todas las cantidades de stock actual con el mismo ruma_id.
            $stockActual = $stockActual->sum('cantidad');
            if($stockActual + $request->cantidad > $ruma->capacidad_unidades){
                return response()->json([
                    'message' => 'No hay espacio en la ruma para esta operacion.'
                ], 422);
            }
        }

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

    public function destroy($id)
    {
        return DB::transaction(function () use ($id) {

            $movimiento = MovimientoStock::lockForUpdate()->findOrFail($id);

            $stock = StockActual::where('producto_id', $movimiento->producto_id)
                ->where('ruma_id', $movimiento->ruma_id)
                ->lockForUpdate()
                ->firstOrFail();

            switch ($movimiento->tipo) {

                case 'INGRESO':
                    $stock->cantidad -= $movimiento->cantidad;
                    break;

                case 'SALIDA':
                    $stock->cantidad += $movimiento->cantidad;
                    break;

                case 'DEVOLUCION_BUENA':
                    $stock->cantidad -= $movimiento->cantidad;
                    break;

                case 'DEVOLUCION_MALA':
                    // Si la devolución mala no afecta stock bueno,
                    // aquí no harías nada o dependerá de tu lógica
                    break;

                case 'AJUSTE':
                    /*
                    Aquí depende de cómo guardaste el ajuste.
                    Si ajuste guarda cantidad positiva o negativa,
                    simplemente:
                    */
                    $stock->cantidad -= $movimiento->cantidad;
                    break;

                case 'DESECHO':
                    $stock->cantidad += $movimiento->cantidad;
                    break;

                default:
                    throw new Exception('Tipo de movimiento no reconocido');
            }

            // 🔥 Validar que no quede negativo
            if ($stock->cantidad < 0) {
                throw new Exception('La reversión dejaría el stock en negativo');
            }

            $stock->save();

            $movimiento->estado = 'ANULADO';
            $movimiento->save();

            return response()->json([
                'message' => 'Movimiento descartado y stock restablecido correctamente'
            ]);
        });
    }
}
