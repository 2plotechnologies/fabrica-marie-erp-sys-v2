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

            $cuenta = $abono->cuenta;

            // 🔁 Restaurar saldo
            $cuenta->saldo += $abono->monto;
            $cuenta->estado = 'PENDIENTE';
            $cuenta->save();

            // 🔁 Movimiento inverso en caja
            MovimientoCaja::create([
                'caja_id' => $abono->movimiento_caja_id
                    ? $abono->movimientoCaja->caja_id
                    : null,
                'tipo' => 'EGRESO',
                'monto' => $abono->monto,
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
