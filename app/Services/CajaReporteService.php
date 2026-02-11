<?php

namespace App\Services;

use App\Models\Caja;

class CajaReporteService
{
    public function generarPorId(int $cajaId)
    {
        $caja = Caja::with('movimientos')
            ->with('usuario')
            ->findOrFail($cajaId);

        $ingresos = $caja->movimientos
            ->where('tipo', 'INGRESO')
            ->sum('monto');

        $egresos = $caja->movimientos
            ->where('tipo', 'EGRESO')
            ->sum('monto');

        return [
            'caja_id' => $caja->id,
            'fecha' => $caja->fecha,
            'usuario' => $caja->usuario->nombre ?? null,
            'estado' => $caja->estado,
            'saldo_inicial' => $caja->saldo_inicial,
            'total_ingresos' => $ingresos,
            'total_egresos' => $egresos,
            'saldo_final' => $caja->saldo_inicial + $ingresos - $egresos,
            'movimientos' => $caja->movimientos
        ];
    }

    public function generarPorUsuarioFecha(int $usuarioId, string $fecha)
    {
        $caja = Caja::where('usuario_id', $usuarioId)
            ->where('fecha', $fecha)
            ->firstOrFail();

        return $this->generarPorId($caja->id);
    }
}
