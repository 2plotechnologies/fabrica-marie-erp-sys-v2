<?php

namespace App\Services;

use App\Models\Venta;
use App\Models\MovimientoStock;
use App\Models\StockActual;
use App\Models\MovimientoCaja;
use Illuminate\Support\Facades\DB;
use Exception;

class VentaService
{
    public function anular(int $ventaId, int $userId)
    {
        return DB::transaction(function () use ($ventaId, $userId) {

            // 🔒 Bloqueo de fila para evitar colisiones
            $venta = Venta::with(['cuenta'])
                ->lockForUpdate()
                ->findOrFail($ventaId);

            // ✅ Validaciones básicas
            if ($venta->estado === 'ANULADA') {
                throw new Exception('La venta ya fue anulada');
            }

            if ($venta->estado !== 'CONFIRMADA') {
                throw new Exception('Solo se pueden anular ventas confirmadas');
            }

            /*
            ======================================================
            🔁 1️⃣ ROLLBACK PROFESIONAL DE STOCK (POR RUMA ORIGINAL)
            ======================================================
            */

            $movimientosSalida = MovimientoStock::where('referencia_tipo', 'VENTA')
                ->where('referencia_id', $venta->id)
                ->where('tipo', 'SALIDA')
                ->get();

            if ($movimientosSalida->isEmpty()) {
                throw new Exception('No existen movimientos de stock para revertir');
            }

            foreach ($movimientosSalida as $mov) {

                $stock = StockActual::firstOrCreate(
                    [
                        'producto_id' => $mov->producto_id,
                        'ruma_id' => $mov->ruma_id
                    ],
                    [
                        'cantidad' => 0
                    ]
                );

                $stock->cantidad += $mov->cantidad;
                $stock->fecha_ultimo_mov = now();
                $stock->save();

                MovimientoStock::create([
                    'tipo' => 'INGRESO',
                    'producto_id' => $mov->producto_id,
                    'ruma_id' => $mov->ruma_id,
                    'cantidad' => $mov->cantidad,
                    'referencia_tipo' => 'ANULACION_VENTA',
                    'referencia_id' => $venta->id,
                    'motivo' => 'Rollback por anulación de venta',
                    'stock_post_mov' => $stock->cantidad,
                    'user_id' => $userId,
                    'created_at' => now()
                ]);
            }

            /*
            =========================================
            💳 2️⃣ ROLLBACK CUENTA POR COBRAR
            =========================================
            */

            if ($venta->cuenta) {

                $tieneAbonos = $venta->cuenta
                    ->abonos()
                    ->where('estado', 'ACTIVO')
                    ->exists();

                if ($tieneAbonos) {
                    throw new Exception(
                        'No se puede anular la venta porque existen abonos registrados'
                    );
                }

                $venta->cuenta->delete();
            }

            /*
            =========================================
            🏦 3️⃣ ROLLBACK EN CAJA (SI FUE CONTADO)
            =========================================
            */

            if ($venta->tipo_pago === 'CONTADO') {

                $caja = request()->get('caja');

                if (!$caja) {
                    throw new Exception(
                        'No existe una caja abierta para registrar la anulación'
                    );
                }

                MovimientoCaja::create([
                    'caja_id' => $caja->id,
                    'tipo' => 'EGRESO',
                    'monto' => $venta->total_neto,
                    'referencia_tipo' => 'ANULACION_VENTA',
                    'referencia_id' => $venta->id,
                    'created_at' => now()
                ]);
            }

            /*
            =========================================
            🔒 4️⃣ CAMBIAR ESTADO DE VENTA
            =========================================
            */

            $venta->estado = 'ANULADA';
            $venta->save();

            return [
                'message' => 'Venta anulada correctamente',
                'venta_id' => $venta->id
            ];
        });
    }
}
