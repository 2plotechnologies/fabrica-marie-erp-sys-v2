<?php

namespace App\Services;

use App\Models\Venta;
use App\Models\MovimientoStock;
use App\Models\StockActual;
use App\Models\MovimientoCaja;
use App\Models\Salida;
use App\Models\StockVendedor;
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
            🔁 1️⃣ ROLLBACK PROFESIONAL DE STOCK (POR STOCK VENDEDOR)
            ======================================================
            */

            foreach ($venta->items as $item) {
                $stockVendedor = StockVendedor::where('producto_id', $item->producto_id)
                    ->where('vendedor_id', $venta->vendedor_id)
                    ->first();

                if ($stockVendedor) {
                    $stockVendedor->cantidad += $item->cantidad;
                    $stockVendedor->save();
                }
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

            $caja = request()->get('caja');
            if (!$caja) {
                    throw new Exception(
                        'No existe una caja abierta para registrar la anulación'
                    );
            }

            if ($venta->tipo_pago === 'CONTADO') {
                if ($venta->total_neto > 0) {
                    MovimientoCaja::create([
                        'caja_id' => $caja->id,
                        'tipo' => 'EGRESO',
                        'estado' => 'APROBADO',
                        'monto' => $venta->total_neto,
                        'referencia_tipo' => 'ANULACION_VENTA',
                        'referencia_id' => $venta->id,
                        'categoria' => 'VENTA',
                        'descripcion' => 'Venta Anulada, ID: ' . $venta->id,
                        'created_at' => now()
                    ]);
                }
            }else{
                if ($venta->adelanto > 0) {
                    MovimientoCaja::create([
                        'caja_id' => $caja->id,
                        'tipo' => 'EGRESO',
                        'estado' => 'APROBADO',
                        'monto' => $venta->adelanto,
                        'referencia_tipo' => 'ANULACION_VENTA',
                        'referencia_id' => $venta->id,
                        'categoria' => 'VENTA',
                        'descripcion' => 'Venta Anulada, ID: ' . $venta->id,
                        'created_at' => now()
                    ]);
                }
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

    public function liberarReserva(Venta $venta)
    {
        foreach ($venta->items as $item) {

            $stock = StockVendedor::where('producto_id', $item->producto_id)
                ->where('vendedor_id', $venta->vendedor_id)
                ->lockForUpdate()
                ->first();

            if (!$stock) {
                continue;
            }

            $stock->stock_reservado -= $item->cantidad;

            if ($stock->stock_reservado < 0) {
                $stock->stock_reservado = 0;
            }

            $stock->save();
        }
    }
}
