<?php

namespace App\Services;

use App\Models\Abono;
use App\Models\MovimientoCaja;
use Illuminate\Support\Facades\DB;
use Exception;

class AbonoService
{
    public function anular(int $abonoId, int $userId)
    {
        return DB::transaction(function () use ($abonoId, $userId) {

            $abono = Abono::with('cuenta')->lockForUpdate()->findOrFail($abonoId);

            if ($abono->estado === 'ANULADO') {
                throw new Exception('El abono ya fue anulado');
            }

            if (strtoupper($abono->metodo_pago ?? '') === 'ADELANTO') {
                throw new Exception('No se puede anular el adelanto de una venta a crédito.');
            }

            $cuenta = $abono->cuenta;

            // 🔁 Restaurar saldo y estado de la cuenta por cobrar
            $cuenta->saldo += $abono->monto;
            if ($cuenta->saldo >= $cuenta->monto_total) {
                $cuenta->saldo = $cuenta->monto_total;
                $cuenta->estado = 'PENDIENTE';
            } else {
                $cuenta->estado = 'PARCIAL';
            }
            $cuenta->save();

            // 🔁 Restaurar deuda actual del cliente
            if ($cuenta->cliente) {
                $cuenta->cliente->increment('deuda_actual', $abono->monto);
            }

            // 🔁 Movimiento inverso en caja
            $cajaAbierta = \App\Models\Caja::where('estado', 'ABIERTA')->first();
            $cajaId = $abono->movimiento_caja_id && $abono->movimientoCaja
                ? $abono->movimientoCaja->caja_id
                : ($cajaAbierta ? $cajaAbierta->id : null);

            MovimientoCaja::create([
                'caja_id' => $cajaId,
                'tipo' => 'EGRESO',
                'estado' => 'APROBADO',
                'monto' => $abono->monto,
                'usuario_id' => $userId,
                'categoria' => 'ANULACION_ABONO',
                'descripcion' => 'Anulación de abono ID: ' . $abono->id . ($cuenta ? ' (Cuenta ID: ' . $cuenta->id . ')' : ''),
                'referencia_tipo' => 'ANULACION_ABONO',
                'referencia_id' => $abono->id,
                'created_at' => now()
            ]);

            // 🔒 Marcar como anulado
            $abono->estado = 'ANULADO';
            $abono->anulado_at = now();
            $abono->anulado_por = $userId;
            $abono->save();

            return [
                'message' => 'Abono anulado correctamente',
                'abono_id' => $abono->id
            ];
        });
    }
}
