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

            // 🔒 Validar si existe un Resumen Diario aprobado exclusivamente para la fecha de la venta.
            $fechaVenta = Carbon::parse($venta->fecha)->toDateString();

            $resumenAprobado = ResumenDiario::where('vendedor_id', $venta->vendedor_id)
                ->whereIn('estado', ['CONFIRMADO', 'APROBADO'])
                ->whereDate('fecha', $fechaVenta)
                ->exists();

            if ($resumenAprobado) {
                throw new Exception('No se puede anular la venta porque ya se registró un resumen diario aprobado para este vendedor en la fecha de la venta (' . Carbon::parse($venta->fecha)->format('d/m/Y') . ').');
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
                if (empty($item->salida_id)) {
                    // Venta directa fábrica: devolver a StockActual en almacén central
                    $movimientosSalida = MovimientoStock::where('referencia_tipo', 'VENTA')
                        ->where('referencia_id', $venta->id)
                        ->where('producto_id', $item->producto_id)
                        ->where('tipo', 'SALIDA')
                        ->get();

                    if ($movimientosSalida->isNotEmpty()) {
                        foreach ($movimientosSalida as $mov) {
                            $stockActual = StockActual::where('producto_id', $item->producto_id)
                                ->where('ruma_id', $mov->ruma_id)
                                ->lockForUpdate()
                                ->first();

                            if (!$stockActual) {
                                $stockActual = StockActual::create([
                                    'producto_id' => $item->producto_id,
                                    'ruma_id' => $mov->ruma_id,
                                    'cantidad' => 0,
                                    'fecha_ultimo_mov' => now()
                                ]);
                            }

                            $stockAnterior = $stockActual->cantidad;
                            $stockActual->cantidad += $mov->cantidad;
                            $stockActual->fecha_ultimo_mov = now();
                            $stockActual->save();

                            if ($stockActual->ruma_id) {
                                $ruma = \App\Models\Ruma::find($stockActual->ruma_id);
                                if ($ruma && $ruma->capacidad_unidades > 0) {
                                    $totalRuma = StockActual::where('ruma_id', $stockActual->ruma_id)->sum('cantidad');
                                    if ($totalRuma >= $ruma->capacidad_unidades) {
                                        $ruma->estado = 'LLENA';
                                        $ruma->save();
                                    }
                                }
                            }

                            MovimientoStock::create([
                                'tipo' => 'DEVOLUCION_BUENA',
                                'producto_id' => $item->producto_id,
                                'ruma_id' => $stockActual->ruma_id,
                                'cantidad' => $mov->cantidad,
                                'referencia_tipo' => 'ANULACION_VENTA',
                                'referencia_id' => $venta->id,
                                'motivo' => 'Anulación de venta directa fábrica',
                                'stock_anterior' => $stockAnterior,
                                'stock_post_mov' => $stockActual->cantidad,
                                'user_id' => $userId,
                                'estado' => 'REGISTRADO',
                                'created_at' => now()
                            ]);
                        }
                    } else {
                        // Fallback si no existen registros de movimientos previos
                        $stockActual = StockActual::where('producto_id', $item->producto_id)
                            ->orderBy('cantidad', 'asc')
                            ->lockForUpdate()
                            ->first();

                        if (!$stockActual) {
                            $rumaId = \App\Models\Ruma::value('id');
                            $stockActual = StockActual::create([
                                'producto_id' => $item->producto_id,
                                'ruma_id' => $rumaId,
                                'cantidad' => 0,
                                'fecha_ultimo_mov' => now()
                            ]);
                        }

                        $stockAnterior = $stockActual->cantidad;
                        $stockActual->cantidad += $item->cantidad;
                        $stockActual->fecha_ultimo_mov = now();
                        $stockActual->save();

                        if ($stockActual->ruma_id) {
                            $ruma = \App\Models\Ruma::find($stockActual->ruma_id);
                            if ($ruma && $ruma->capacidad_unidades > 0) {
                                $totalRuma = StockActual::where('ruma_id', $stockActual->ruma_id)->sum('cantidad');
                                if ($totalRuma >= $ruma->capacidad_unidades) {
                                    $ruma->estado = 'LLENA';
                                    $ruma->save();
                                }
                            }
                        }

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
                    }
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
                } else {
                    StockVendedor::create([
                        'producto_id' => $item->producto_id,
                        'vendedor_id' => $venta->vendedor_id,
                        'salida_id' => $targetSalidaId,
                        'cantidad' => $item->cantidad,
                        'cantidad_entregada' => $item->cantidad,
                        'stock_reservado' => 0,
                        'vendido' => 0,
                        'devuelto' => 0,
                        'fecha_ultimo_mov' => now()
                    ]);
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
            💳 2️⃣ ROLLBACK CUENTA POR COBRAR Y DEUDA CLIENTE
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

                // 🔁 Restar de la deuda acumulada del cliente
                $cliente = \App\Models\Cliente::find($venta->cliente_id);
                if ($cliente) {
                    $montoRestar = $venta->total_neto - $venta->adelanto;
                    if ($montoRestar > 0) {
                        $cliente->update([
                            'deuda_actual' => max(0, $cliente->deuda_actual - $montoRestar)
                        ]);
                    }
                }

                $venta->cuenta->delete();
            } else if ($venta->tipo_pago === 'CREDITO') {
                $cliente = \App\Models\Cliente::find($venta->cliente_id);
                if ($cliente) {
                    $montoRestar = $venta->total_neto - $venta->adelanto;
                    if ($montoRestar > 0) {
                        $cliente->update([
                            'deuda_actual' => max(0, $cliente->deuda_actual - $montoRestar)
                        ]);
                    }
                }
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
