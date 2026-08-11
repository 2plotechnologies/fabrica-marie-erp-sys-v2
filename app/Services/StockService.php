<?php

namespace App\Services;

use App\Models\StockActual;
use App\Models\StockVendedor;
use App\Models\MovimientoStock;
use App\Models\Ruma;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;

class StockService
{
    public static function registrarMovimiento(array $data)
    {
        return DB::transaction(function () use ($data) {

            // 1. Obtener stock actual (o crear si no existe)
            $stock = StockActual::firstOrCreate(
                [
                    'producto_id' => $data['producto_id'],
                    'ruma_id' => $data['ruma_id']
                ],
                [
                    'cantidad' => 0
                ]
            );

            $cantidadActual = $stock->cantidad;
            $cantidadMov = $data['cantidad'];

            // 2. Calcular nuevo stock según tipo
            switch ($data['tipo']) {

                case 'INGRESO':
                case 'DEVOLUCION_BUENA':
                    //Marcar ruma como llena automaticamente si el ingreso o devolucion llena la ruma.
                    $ruma = Ruma::find($data['ruma_id']);
                    //Sumar todas las cantidades de stock actual con el mismo ruma_id.
                    $stockActual = StockActual::where('ruma_id', $data['ruma_id']);
                    $stockActual = $stockActual->sum('cantidad');
                    if($stockActual + $data['cantidad'] == $ruma->capacidad_unidades){
                        $ruma->estado = 'LLENA';
                        $ruma->save();
                    }

                    $nuevoStock = $cantidadActual + $cantidadMov;
                    break;
                case 'DEVOLUCION_MALA':
                    $nuevoStock = $cantidadActual;
                    break;

                case 'SALIDA':
                case 'DESECHO':
                    $permitirNegativo = auth()->user()?->can('stock.negativo') ?? false;

                    $disponible = $stock->cantidad - ($stock->stock_reservado ?? 0);

                    if (!$permitirNegativo && $cantidadMov > $disponible) {
                        throw new Exception("Stock insuficiente. Disponible: {$disponible}");
                    }

                    if ($cantidadActual < $cantidadMov) {
                        throw new Exception('Stock insuficiente');
                    }

                    $nuevoStock = $cantidadActual - $cantidadMov;

                    //Si la ruma estaba llena, marcar como disponible.
                    $ruma = Ruma::find($data['ruma_id']);
                    $ruma->estado = 'ACTIVA';
                    $ruma->save();
                    break;

                case 'AJUSTE':
                    $nuevoStock = $cantidadMov;
                    break;
                    
                case 'TRANSFERENCIA_VENDEDOR':
                    $nuevoStock = $cantidadActual;
                    break;

                default:
                    throw new Exception('Tipo de movimiento inválido');
            }

            // 3. Actualizar stock_actual
            $stock->cantidad = $nuevoStock;
            $stock->fecha_ultimo_mov = Carbon::now();
            $stock->save();

            // 4. Registrar movimiento
            $movimiento = MovimientoStock::create([
                'tipo' => $data['tipo'],
                'producto_id' => $data['producto_id'],
                'ruma_id' => $data['ruma_id'],
                'cantidad' => $cantidadMov,
                'referencia_tipo' => $data['referencia_tipo'] ?? null,
                'referencia_id' => $data['referencia_id'] ?? null,
                'motivo' => $data['motivo'] ?? null,
                'stock_anterior' => $cantidadActual,
                'stock_post_mov' => $nuevoStock,
                'user_id' => $data['user_id'] ?? null,
                'estado' => 'REGISTRADO',
                'created_at' => Carbon::now()
            ]);

            return $movimiento;
        });
    }

     public function descontarStock(
        int $productoId,
        float $cantidad,
        int $ventaId,
        int $userId
    ) {
        $stocks = StockActual::where('producto_id', $productoId)
            ->where('cantidad', '>', 0)
            ->orderBy('cantidad', 'desc')
            ->get();

        $faltante = $cantidad;

        foreach ($stocks as $stock) {

            if ($faltante <= 0) break;

            $descuento = min($stock->cantidad, $faltante);

            // ✅ Guardamos el stock antes de modificarlo
            $stockAnterior = $stock->cantidad;

            $stock->cantidad -= $descuento;
            $stock->fecha_ultimo_mov = now();
            $stock->save();

            MovimientoStock::create([
                'tipo' => 'SALIDA',
                'producto_id' => $productoId,
                'ruma_id' => $stock->ruma_id,
                'cantidad' => $descuento,
                'referencia_tipo' => 'VENTA',
                'referencia_id' => $ventaId,
                'motivo' => 'Confirmación de venta',
                'stock_anterior' => $stockAnterior,
                'stock_post_mov' => $stock->cantidad,
                'user_id' => $userId,
                'estado' => 'REGISTRADO',
                'created_at' => now()
            ]);

            $faltante -= $descuento;
        }

        if ($faltante > 0) {
            throw new Exception('Stock insuficiente para el producto ID: ' . $productoId);
        }
    }

    public function descontarStockVendedor(
        int $productoId,
        float $cantidad,
        int $vendedorId,
    ) {
        $salidaId = Salida::where('vendedor_id', $vendedorId)
            ->where('estado', 'EN_RUTA')
            ->where('producto_id', $productoId)
            ->orderBy('fecha', 'desc')
            ->first()
            ->id;
        $stocks = StockVendedor::where('producto_id', $productoId)
            ->where('cantidad', '>', 0)
            ->where('vendedor_id', $vendedorId)
            ->where('salida_id', $salidaId)
            ->orderBy('cantidad', 'desc')
            ->get();

        $faltante = $cantidad;

        foreach ($stocks as $stock) {

            if ($faltante <= 0) break;

            $descuento = min($stock->cantidad, $faltante);

            // ✅ Guardamos el stock antes de modificarlo
            $stockAnterior = $stock->cantidad;

            $stock->cantidad -= $descuento;
            $stock->fecha_ultimo_mov = now();
            $stock->save();

            $faltante -= $descuento;
        }

        if ($faltante > 0) {
            throw new Exception('Stock insuficiente para el producto ID: ' . $productoId);
        }
    }
}
