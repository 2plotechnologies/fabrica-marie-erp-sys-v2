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

        $totalIngresos = $caja->movimientos
            ->where('tipo', 'INGRESO')
            ->where('estado', 'APROBADO')
            ->sum('monto');

        $totalEgresos = $caja->movimientos
            ->where('tipo', 'EGRESO')
            ->where('estado', 'APROBADO')
            ->sum('monto');

        $ingresosDigitales = $caja->movimientos
            ->where('tipo', 'INGRESO')
            ->where('estado', 'APROBADO')
            ->filter(fn($m) => strtoupper($m->metodo_pago ?? 'EFECTIVO') !== 'EFECTIVO')
            ->sum('monto');

        $caja->total_ingresos = $totalIngresos;
        $caja->total_egresos = $totalEgresos;
        $caja->saldo_actual = $caja->saldo_inicial + $totalIngresos - $totalEgresos - $ingresosDigitales;
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
        if (isset($data['monto']) && $data['monto'] <= 0) {
            return null;
        }

        $caja = self::obtenerCajaAbierta();

        if (!$caja) {
            throw new Exception('No se puede registrar el movimiento porque no existe una caja abierta.');
        }

        $metodoPago = strtoupper($data['metodo_pago'] ?? 'EFECTIVO');

        if (strtoupper($data['tipo']) === 'EGRESO' && $metodoPago === 'EFECTIVO') {
            $ingresosEfectivo = MovimientoCaja::where('caja_id', $caja->id)
                ->where('tipo', 'INGRESO')
                ->where('estado', 'APROBADO')
                ->where(function($q) {
                    $q->whereNull('metodo_pago')->orWhere('metodo_pago', 'EFECTIVO');
                })
                ->sum('monto');
                
            $egresosEfectivo = MovimientoCaja::where('caja_id', $caja->id)
                ->where('tipo', 'EGRESO')
                ->where('estado', 'APROBADO')
                ->where(function($q) {
                    $q->whereNull('metodo_pago')->orWhere('metodo_pago', 'EFECTIVO');
                })
                ->sum('monto');
                
            $saldoDisponible = $caja->saldo_inicial + $ingresosEfectivo - $egresosEfectivo;

            if ($saldoDisponible <= 0) {
                throw new Exception('No se puede registrar el egreso en efectivo porque el saldo en efectivo actual de la caja es 0.');
            }

            if ($data['monto'] > $saldoDisponible) {
                throw new Exception('No se puede registrar el egreso en efectivo porque el monto supera el saldo disponible. Saldo disponible en efectivo: S/ ' . number_format($saldoDisponible, 2));
            }
        }

        $movimiento = MovimientoCaja::create([
            'caja_id' => $caja->id,
            'tipo' => strtoupper($data['tipo']),
            'estado' => $data['estado'] ?? 'PENDIENTE',
            'monto' => $data['monto'],
            'metodo_pago' => $metodoPago,
            'comprobante' => $data['comprobante'] ?? null,
            'categoria' => $data['categoria'],
            'descripcion' => $data['descripcion'],
            'referencia_tipo' => $data['referencia_tipo'] ?? null,
            'referencia_id' => $data['referencia_id'] ?? null,
            'created_at' => $data['created_at'] ?? Carbon::now()
        ]);

        return $movimiento;
    }

    public function cerrarCajasAntiguas()
    {
        $cajasAbiertas = Caja::with('movimientos')
            ->where('estado', 'ABIERTA')
            ->where('fecha', '<', now()->toDateString())
            ->get();

        foreach ($cajasAbiertas as $caja) {
            $ingresosEfectivo = $caja->movimientos
                ->where('tipo', 'INGRESO')
                ->where('estado', 'APROBADO')
                ->filter(fn($m) => strtoupper($m->metodo_pago ?? 'EFECTIVO') === 'EFECTIVO')
                ->sum('monto');

            $egresosEfectivo = $caja->movimientos
                ->where('tipo', 'EGRESO')
                ->where('estado', 'APROBADO')
                ->filter(fn($m) => strtoupper($m->metodo_pago ?? 'EFECTIVO') === 'EFECTIVO')
                ->sum('monto');

            $totalIngresos = $caja->movimientos->where('tipo', 'INGRESO')->where('estado', 'APROBADO')->sum('monto');
            $totalEgresos = $caja->movimientos->where('tipo', 'EGRESO')->where('estado', 'APROBADO')->sum('monto');

            $caja->total_ingresos = $totalIngresos;
            $caja->total_egresos = $totalEgresos;
            $caja->saldo_actual = $caja->saldo_inicial + $ingresosEfectivo - $egresosEfectivo;
            $caja->estado = 'CERRADA';
            $caja->cerrado_at = now();
            $caja->cerrado_by = auth()->id() ?? 1;
            $caja->save();

            CierreCaja::updateOrCreate(
                ['caja_id' => $caja->id],
                [
                    'conteo_real' => $caja->saldo_actual,
                    'saldo_teorico' => $caja->saldo_actual,
                    'diferencia' => 0,
                    'estado' => 'CUADRADO',
                ]
            );
        }

        return $cajasAbiertas;
    }
}
