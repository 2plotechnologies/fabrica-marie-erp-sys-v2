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

            if ($request->has('pagos') && is_array($request->pagos) && count($request->pagos) > 0) {
                $request->validate([
                    'pagos' => 'required|array|min:1',
                    'pagos.*.monto' => 'required|numeric|min:0.01',
                    'pagos.*.metodo_pago' => 'required|in:EFECTIVO,TRANSFERENCIA,YAPE,PLIN,DEPOSITO',
                    'pagos.*.banco' => 'nullable|string',
                    'pagos.*.numero_operacion' => 'nullable|string',
                ]);

                $cuenta = CuentaPorCobrar::findOrFail($cuenta_id);
                $caja = Caja::where('estado', 'ABIERTA')
                    ->where('fecha', now()->format('Y-m-d'))
                    ->first();

                $totalAbonado = 0;
                $abonosCreados = [];

                foreach ($request->pagos as $pagoItem) {
                    $montoItem = (float)$pagoItem['monto'];
                    if ($montoItem <= 0) continue;

                    $metodo = strtoupper($pagoItem['metodo_pago']);
                    $banco = $pagoItem['banco'] ?? null;
                    $numOp = $pagoItem['numero_operacion'] ?? null;

                    $referencia = null;
                    if ($metodo === 'DEPOSITO' && $banco && $numOp) {
                        $referencia = 'Depósito ' . $banco . ' - Op: ' . $numOp;
                    } else {
                        $referencia = 'Abono ' . strtolower($metodo);
                    }

                    $mov = MovimientoCaja::create([
                        'caja_id' => $caja ? $caja->id : null,
                        'tipo' => 'INGRESO',
                        'estado' => 'APROBADO',
                        'monto' => $montoItem,
                        'usuario_id' => auth()->id(),
                        'categoria' => 'ABONO',
                        'descripcion' => 'Abono a cuenta por cobrar, ID: ' . $cuenta->id . ' (' . $referencia . ')',
                        'referencia_tipo' => 'ABONO',
                        'referencia_id' => $cuenta->id,
                        'created_at' => now()
                    ]);

                    $abono = Abono::create([
                        'cuenta_id' => $cuenta->id,
                        'usuario_id' => auth()->id(),
                        'monto' => $montoItem,
                        'metodo_pago' => $metodo,
                        'banco' => $banco,
                        'numero_operacion' => $numOp,
                        'referencia' => $referencia,
                        'fecha' => now(),
                        'movimiento_caja_id' => $mov->id
                    ]);

                    $abonosCreados[] = $abono;
                    $totalAbonado += $montoItem;
                }

                $cuenta->saldo -= $totalAbonado;
                if ($cuenta->saldo < 0) $cuenta->saldo = 0;
                $cuenta->estado = $cuenta->saldo == 0 ? 'PAGADO' : 'PARCIAL';
                $cuenta->save();

                // Actualizar deuda actual del cliente
                $cliente = $cuenta->cliente;
                $cliente->update([
                    'deuda_actual' => max(0, $cliente->deuda_actual - $totalAbonado)
                ]);

                return response()->json($abonosCreados);
            }

            $request->validate([
                'monto' => 'required|numeric|min:0',
                'metodo_pago' => 'required|in:EFECTIVO,TRANSFERENCIA,YAPE,PLIN,DEPOSITO',
                'banco' => 'required_if:metodo_pago,DEPOSITO|nullable|string',
                'numero_operacion' => 'required_if:metodo_pago,DEPOSITO|nullable|string',
            ]);

            $cuenta = CuentaPorCobrar::findOrFail($cuenta_id);

            $caja = Caja::where('estado', 'ABIERTA')
                ->where('fecha', now()->format('Y-m-d'))
                ->first();

            $referencia = $request->referencia;
            if (!$referencia) {
                if ($request->metodo_pago === 'DEPOSITO' && $request->banco && $request->numero_operacion) {
                    $referencia = 'Depósito ' . $request->banco . ' - Op: ' . $request->numero_operacion;
                } else {
                    $referencia = 'Abono ' . strtolower($request->metodo_pago);
                }
            }

            $mov = MovimientoCaja::create([
                'caja_id' => $caja ? $caja->id : null,
                'tipo' => 'INGRESO',
                'estado' => 'APROBADO',
                'monto' => $request->monto,
                'usuario_id' => auth()->id(),
                'categoria' => 'ABONO',
                'descripcion' => 'Abono a cuenta por cobrar, ID: ' . $cuenta->id . ' (' . $referencia . ')',
                'referencia_tipo' => 'ABONO',
                'referencia_id' => $cuenta->id,
                'created_at' => now()
            ]);

            $abono = Abono::create([
                'cuenta_id' => $cuenta->id,
                'usuario_id' => auth()->id(),
                'monto' => $request->monto,
                'metodo_pago' => $request->metodo_pago,
                'banco' => $request->banco,
                'numero_operacion' => $request->numero_operacion,
                'referencia' => $referencia,
                'fecha' => now(),
                'movimiento_caja_id' => $mov->id
            ]);

            $cuenta->saldo -= $request->monto;
            if ($cuenta->saldo < 0) $cuenta->saldo = 0;
            $cuenta->estado = $cuenta->saldo == 0 ? 'PAGADO' : 'PARCIAL';
            $cuenta->save();

            //Actualizar deuda actual del cliente
            $cliente = $cuenta->cliente;
            $cliente->update([
                'deuda_actual' => max(0, $cliente->deuda_actual - $request->monto)
            ]);

            return $abono;
        });
    }

    public function anular($id, AbonoService $service)
    {
        if (is_string($id) && str_starts_with($id, 'adelanto-')) {
            return response()->json(['message' => 'No se puede anular el adelanto de una venta a crédito.'], 422);
        }

        try {
            return response()->json($service->anular((int)$id, auth()->id()));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
