<?php

namespace App\Services;

use App\Models\StockActual;
use App\Models\MovimientoStock;
use Carbon\Carbon;
use Exception;
use DB;

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
                case 'DEVOLUCION':
                    $nuevoStock = $cantidadActual + $cantidadMov;
                    break;

                case 'SALIDA':
                    if ($cantidadActual < $cantidadMov) {
                        throw new Exception('Stock insuficiente');
                    }
                    $nuevoStock = $cantidadActual - $cantidadMov;
                    break;

                case 'AJUSTE':
                    $nuevoStock = $cantidadMov;
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
                'stock_post_mov' => $nuevoStock,
                'user_id' => $data['user_id'] ?? null,
                'created_at' => Carbon::now()
            ]);

            return $movimiento;
        });
    }
}
