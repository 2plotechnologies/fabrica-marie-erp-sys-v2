<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Caja;
use App\Models\CierreCaja;

class CerrarCajaAutomaticamente extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:cerrar-caja-automaticamente';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cierra automáticamente las cajas abiertas a medianoche.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $cajasAbiertas = Caja::with('movimientos')->where('estado', 'ABIERTA')->get();

        if ($cajasAbiertas->isEmpty()) {
            $this->info('No hay cajas abiertas para cerrar.');
            return;
        }

        foreach ($cajasAbiertas as $caja) {
            $ingresos = $caja->movimientos
                ->where('tipo', 'INGRESO')
                ->sum('monto');

            $egresos = $caja->movimientos
                ->where('tipo', 'EGRESO')
                ->where('estado', 'APROBADO')
                ->sum('monto');

            $caja->total_ingresos = $ingresos;
            $caja->total_egresos = $egresos;
            $caja->saldo_actual = $caja->saldo_inicial + $ingresos - $egresos;
            $caja->estado = 'CERRADA';
            $caja->cerrado_at = now();
            $caja->cerrado_by = 1;
            $caja->save();

            CierreCaja::create([
                'caja_id' => $caja->id,
                'conteo_real' => $caja->saldo_actual,
                'diferencia' => 0,
                'saldo_teorico' => $caja->saldo_actual,
                'estado' => 'CUADRADO',
            ]);
        }

        $this->info('Cajas cerradas exitosamente.');
    }
}
