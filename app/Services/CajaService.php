<?php

namespace App\Services;

use App\Models\Caja;
use App\Models\MovimientoCaja;
use App\Models\CierreCaja;
use Carbon\Carbon;
use Exception;

class CajaService
{
    public function cerrarCaja(int $cajaId, array $data)
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
        $caja->cerrado_by = auth()->id();
        $caja->save();

        $diferencia = $data['conteo_real'] - $caja->saldo_actual;

        $estado = 'CUADRADO';

        if ($diferencia < 0) {
            $estado = 'FALTANTE';
        } elseif ($diferencia > 0) {
            $estado = 'SOBRANTE';
        }

        $cierreCaja = CierreCaja::create([
            'caja_id' => $caja->id,
            'conteo_real' => $data['conteo_real'],
            'saldo_teorico' => $caja->saldo_actual,
            'diferencia' => $diferencia,
            'estado' => $estado,
        ]);

        return $caja;
    }

    private static function obtenerCajaAbierta()
    {
        $hoy = Carbon::today();

        $caja = Caja::whereDate('fecha', $hoy)
            ->where('estado', 'ABIERTA')
            ->first();

        if (!$caja) {
            throw new \Exception('No hay una caja ABIERTA para el día de hoy.');
        }

        return $caja;
    }

    public static function registrarMovimiento(array $data)
    {
        $caja = self::obtenerCajaAbierta();

        $movimiento = MovimientoCaja::create([
            'caja_id' => $caja->id,
            'tipo' => $data['tipo'],
            'monto' => $data['monto'],
            'categoria' => $data['categoria'],
            'descripcion' => $data['descripcion'],
            'referencia_tipo' => $data['referencia_tipo'] ?? null,
            'referencia_id' => $data['referencia_id'] ?? null,
            'created_at' => Carbon::now()
        ]);

        return $movimiento;
    }
}
