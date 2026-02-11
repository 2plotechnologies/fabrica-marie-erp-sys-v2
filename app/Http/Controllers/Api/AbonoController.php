<?php

namespace App\Http\Controllers\Api;

use App\Models\Abono;
use App\Models\CuentaPorCobrar;
use App\Models\MovimientoCaja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AbonoController extends Controller
{
    public function store(Request $request)
    {
        return DB::transaction(function () use ($request) {

            $cuenta = CuentaPorCobrar::findOrFail($request->cuenta_id);

            $mov = MovimientoCaja::create([
                'caja_id' => $request->caja_id,
                'tipo' => 'INGRESO',
                'monto' => $request->monto,
                'created_at' => now()
            ]);

            $abono = Abono::create([
                'cuenta_id' => $cuenta->id,
                'monto' => $request->monto,
                'metodo_pago' => $request->metodo_pago,
                'fecha' => now(),
                'movimiento_caja_id' => $mov->id
            ]);

            $cuenta->saldo -= $request->monto;
            $cuenta->estado = $cuenta->saldo == 0 ? 'PAGADO' : 'PARCIAL';
            $cuenta->save();

            return $abono;
        });
    }
}
