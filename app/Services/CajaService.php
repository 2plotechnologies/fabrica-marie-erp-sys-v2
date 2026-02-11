<?php

namespace App\Services;

use App\Models\Caja;
use Exception;

class CajaService
{
    public function cerrarCaja(int $cajaId)
    {
        $caja = Caja::with('movimientos')->lockForUpdate()->findOrFail($cajaId);

        if ($caja->estado !== 'ABIERTA') {
            throw new Exception('La caja ya está cerrada');
        }

        $ingresos = $caja->movimientos
            ->where('tipo', 'INGRESO')
            ->sum('monto');

        $egresos = $caja->movimientos
            ->where('tipo', 'EGRESO')
            ->sum('monto');

        $caja->total_ingresos = $ingresos;
        $caja->total_egresos = $egresos;
        $caja->saldo_actual = $caja->saldo_inicial + $ingresos - $egresos;
        $caja->estado = 'CERRADA';
        $caja->cerrado_at = now();
        $caja->save();

        return $caja;
    }
}
