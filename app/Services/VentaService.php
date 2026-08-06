<?php

namespace App\Services;

use App\Models\Venta;
use App\Models\MovimientoStock;
use App\Models\StockActual;
use App\Models\MovimientoCaja;
use App\Models\Salida;
use App\Models\SalidaItem;
use App\Models\StockVendedor;
use App\Models\ResumenDiario;
use Illuminate\Support\Facades\DB;
use Exception;
use Carbon\Carbon;

class VentaService
{
    public function anular(int $ventaId, int $userId)
    {
        return DB::transaction(function () use ($ventaId, $userId) {

            // 🔒 Bloqueo de fila para evitar colisiones
            $venta = Venta::with(['cuenta', 'items'])
                ->lockForUpdate()
                ->findOrFail($ventaId);

            // ✅ Validaciones básicas
            if ($venta->estado === 'ANULADA') {
                throw new Exception('La venta ya fue anulada');
            }

            if ($venta->estado !== 'CONFIRMADA') {
                throw new Exception('Solo se pueden anular ventas confirmadas');
            }

            // 🔒 Validar si existe un Resumen Diario aprobado
            $resumenAprobado = ResumenDiario::where('vendedor_id', $venta->vendedor_id)
                ->whereIn('estado', ['CONFIRMADO', 'APROBADO'])
                ->where(function ($query) use ($venta) {
                    $query->whereDate('fecha', Carbon::parse($venta->fecha)->toDateString());
                    $salidaIds = $venta->items->pluck('salida_id')->filter()->unique();
                    if ($salidaIds->isNotEmpty()) {
                        $query->orWhereIn('salida_id', $salidaIds);
                    }
                })
                ->exists();

            if ($resumenAprobado) {
                throw new Exception('No se puede anular la venta porque ya se registró un resumen diario aprobado para este vendedor.');
            }

            // 🔒 Validar si el vendedor tiene una salida en ruta activa
            $salidaEnRuta = Salida::where('vendedor_id', $venta->vendedor_id)
                ->where('estado', 'EN_RUTA')
                ->first();

            $tieneItemsSalida = $venta->items->pluck('salida_id')->filter()->isNotEmpty();

            if (!$salidaEnRuta && $tieneItemsSalida) {
                throw new Exception('No se puede anular la venta porque el vendedor ya no tiene una salida en ruta activa.');
            }

            /*
            ======================================================
            🔁 1️⃣ ROLLBACK PROFESIONAL DE STOCK (POR STOCK VENDEDOR)
            ======================================================
            */

            foreach ($venta->items as $item) {
                if (empty($item->salida_id) && !$salidaEnRuta) {
                    // Venta directa fábrica sin salida en ruta: devolver a StockActual
                    $stockActual = StockActual::where('producto_id', $item->producto_id)->orderBy('cantidad', 'asc')->first();
                    if (!$stockActual) {
                        $stockActual = StockActual::firstOrCreate(
                            ['producto_id' => $item->producto_id],
                            ['cantidad' => 0]
                        );
                    }
                    $stockAnterior = $stockActual->cantidad;
                    $stockActual->cantidad += $item->cantidad;
                    $stockActual->fecha_ultimo_mov = now();
                    $stockActual->save();

                    MovimientoStock::create([
                        'tipo' => 'DEVOLUCION_BUENA',
                        'producto_id' => $item->producto_id,
                        'ruma_id' => $stockActual->ruma_id,
                        'cantidad' => $item->cantidad,
                        'referencia_tipo' => 'ANULACION_VENTA',
                        'referencia_id' => $venta->id,
                        'motivo' => 'Anulación de venta directa fábrica',
                        'stock_anterior' => $stockAnterior,
                        'stock_post_mov' => $stockActual->cantidad,
                        'user_id' => $userId,
                        'estado' => 'REGISTRADO',
                        'created_at' => now()
                    ]);
                    continue;
                }

                $targetSalidaId = $item->salida_id ?? $salidaEnRuta?->id;

                $stockVendedor = StockVendedor::where('producto_id', $item->producto_id)
                    ->where('vendedor_id', $venta->vendedor_id)
                    ->when($targetSalidaId, function ($q) use ($targetSalidaId) {
                        $q->where('salida_id', $targetSalidaId);
                    })
                    ->lockForUpdate()
                    ->first();

                if ($stockVendedor) {
                    $stockVendedor->cantidad += $item->cantidad;
                    if ($stockVendedor->vendido >= $item->cantidad) {
                        $stockVendedor->vendido -= $item->cantidad;
                    } else {
                        $stockVendedor->vendido = 0;
                    }
                    $stockVendedor->fecha_ultimo_mov = now();
                    $stockVendedor->save();
                }

                if ($targetSalidaId) {
                    $salidaItem = SalidaItem::where('salida_id', $targetSalidaId)
                        ->where('producto_id', $item->producto_id)
                        ->first();

                    if ($salidaItem) {
                        $salidaItem->cantidad += $item->cantidad;
                        $salidaItem->save();
                    }
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

            if (empty($item->salida_id)) {
                continue;
            }

            $query = StockVendedor::where('producto_id', $item->producto_id)
                ->where('vendedor_id', $venta->vendedor_id);

            if (!empty($item->salida_id)) {
                $query->where('salida_id', $item->salida_id);
            }

            $stock = $query->lockForUpdate()->first();

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
