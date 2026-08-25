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

        // Verificar que no existan movimientos pendientes de conciliar
        $pendientesCount = $caja->movimientos()->where('estado', 'PENDIENTE')->count();
        if ($pendientesCount > 0) {
            throw new Exception("No se puede cerrar la caja. Existen {$pendientesCount} movimientos pendientes de conciliar. Debes conciliar o rechazar todos los movimientos antes de cerrar.");
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

    public static function obtenerSaldoDisponibleMetodo(Caja $caja, string $metodoPago): float
    {
        $metodo = strtoupper($metodoPago ?: 'EFECTIVO');

        $ingresos = MovimientoCaja::where('caja_id', $caja->id)
            ->where('tipo', 'INGRESO')
            ->where('estado', 'APROBADO')
            ->where(function($q) use ($metodo) {
                if ($metodo === 'EFECTIVO') {
                    $q->whereNull('metodo_pago')->orWhere('metodo_pago', 'EFECTIVO');
                } else {
                    $q->where('metodo_pago', $metodo);
                }
            })
            ->sum('monto');

        $egresos = MovimientoCaja::where('caja_id', $caja->id)
            ->where('tipo', 'EGRESO')
            ->where('estado', 'APROBADO')
            ->where(function($q) use ($metodo) {
                if ($metodo === 'EFECTIVO') {
                    $q->whereNull('metodo_pago')->orWhere('metodo_pago', 'EFECTIVO');
                } else {
                    $q->where('metodo_pago', $metodo);
                }
            })
            ->sum('monto');

        if ($metodo === 'EFECTIVO') {
            return (float) ($caja->saldo_inicial + $ingresos - $egresos);
        }

        return (float) ($ingresos - $egresos);
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
        $estado = $data['estado'] ?? 'PENDIENTE';

        // Solo validar saldo disponible si el movimiento se crea directamente como APROBADO.
        if ($estado === 'APROBADO' && strtoupper($data['tipo']) === 'EGRESO') {
            $saldoDisponible = self::obtenerSaldoDisponibleMetodo($caja, $metodoPago);

            if ($data['monto'] > $saldoDisponible) {
                throw new Exception('No se puede registrar el egreso en ' . $metodoPago . ' porque supera el saldo disponible (S/ ' . number_format(max(0, $saldoDisponible), 2) . ').');
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
            // Auto-conciliar todos los movimientos PENDIENTES de esta caja anterior
            $movimientosPendientes = MovimientoCaja::where('caja_id', $caja->id)
                ->where('estado', 'PENDIENTE')
                ->get();

            foreach ($movimientosPendientes as $mov) {
                $mov->estado = 'APROBADO';
                $mov->conciliado_by = auth()->id() ?? $caja->usuario_id;
                $mov->save();

                // Si es un gasto de vendedor, actualizar su estado a CONFIRMADO
                if ($mov->referencia_tipo === 'GASTO' && $mov->referencia_id) {
                    $gasto = \App\Models\Gasto::find($mov->referencia_id);
                    if ($gasto) {
                        $gasto->estado = 'CONFIRMADO';
                        $gasto->save();
                    }
                }
            }

            $caja->load('movimientos');

            $totalIngresos = $caja->movimientos->where('tipo', 'INGRESO')->where('estado', 'APROBADO')->sum('monto');
            $totalEgresos = $caja->movimientos->where('tipo', 'EGRESO')->where('estado', 'APROBADO')->sum('monto');
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
            $caja->cerrado_by = auth()->id() ?? $caja->usuario_id;
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
