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
        $cuenta = CuentaPorCobrar::with('venta')->findOrFail($cuenta_id);
        $abonos = Abono::where('cuenta_id', $cuenta_id)->get()->toArray();

        // Agregar el adelanto como un pago simulado
        if ($cuenta->venta && $cuenta->venta->adelanto > 0) {
            $adelanto = [
                'id' => 'adelanto-' . $cuenta->venta->id,
                'cuenta_id' => $cuenta_id,
                'monto' => $cuenta->venta->adelanto,
                'metodo_pago' => 'ADELANTO',
                'fecha' => $cuenta->venta->fecha,
                'referencia' => 'Venta ' . $cuenta->venta->codigo,
            ];
            array_unshift($abonos, $adelanto);
        }

        return response()->json($abonos);
    }
    public function store(Request $request, $cuenta_id)
    {
        return DB::transaction(function () use ($request, $cuenta_id) {

            $request->validate([
                'monto' => 'required|numeric|min:0',
                'metodo_pago' => 'required|in:EFECTIVO,TRANSFERENCIA,YAPE,PLIN,DEPOSITO',
            ]);

            $cuenta = CuentaPorCobrar::findOrFail($cuenta_id);

            $caja = Caja::where('estado', 'ABIERTA')
                ->where('fecha', now()->format('Y-m-d'))
                ->first();

            $mov = MovimientoCaja::create([
                'caja_id' => $caja->id,
                'tipo' => 'INGRESO',
                'estado' => 'APROBADO',
                'monto' => $request->monto,
                'usuario_id' => auth()->id(),
                'categoria' => 'ABONO',
                'descripcion' => 'Abono a cuenta por cobrar, ID: ' . $cuenta->id,
                'referencia_tipo' => 'ABONO',
                'referencia_id' => $cuenta->id,
                'created_at' => now()
            ]);

            $abono = Abono::create([
                'cuenta_id' => $cuenta->id,
                'usuario_id' => auth()->id(),
                'monto' => $request->monto,
                'metodo_pago' => $request->metodo_pago,
                'fecha' => now(),
                'movimiento_caja_id' => $mov->id
            ]);

            $cuenta->saldo -= $request->monto;
            $cuenta->estado = $cuenta->saldo == 0 ? 'PAGADO' : 'PARCIAL';
            $cuenta->save();

            //Actualizar deuda actual del cliente
            $cliente = $cuenta->cliente;
            $cliente->update([
                'deuda_actual' => $cliente->deuda_actual - $request->monto
            ]);

            return $abono;
        });
    }

    public function anular($id, AbonoService $service)
    {
        return $service->anular($id, auth()->id());
    }
}
