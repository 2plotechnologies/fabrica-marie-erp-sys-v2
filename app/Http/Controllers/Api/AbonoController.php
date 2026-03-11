<?php

namespace App\Http\Controllers\Api;

use App\Models\Abono;
use App\Models\CuentaPorCobrar;
use App\Models\MovimientoCaja;
use App\Models\Caja;
use Illuminate\Http\Request;
use App\Services\AbonoService;
use Illuminate\Support\Facades\DB;

class AbonoController extends Controller
{
    public function index($cuenta_id)
    {
        return Abono::where('cuenta_id', $cuenta_id)->get();
    }
    public function store(Request $request, $cuenta_id)
    {
        return DB::transaction(function () use ($request, $cuenta_id) {

            $request->validate([
                'monto' => 'required|numeric|min:0',
                'metodo_pago' => 'required|in:EFECTIVO,TRANSFERENCIA,OTRO',
            ]);

            $cuenta = CuentaPorCobrar::findOrFail($cuenta_id);

            $caja = Caja::where('estado', 'ABIERTA')
                ->where('fecha', now()->format('Y-m-d'))
                ->first();

            $mov = MovimientoCaja::create([
                'caja_id' => $caja->id,
                'tipo' => 'INGRESO',
                'monto' => $request->monto,
                'referencia_tipo' => 'ABONO',
                'referencia_id' => $cuenta->id,
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

    public function anular($id, AbonoService $service)
    {
        return $service->anular($id, auth()->id());
    }
}
