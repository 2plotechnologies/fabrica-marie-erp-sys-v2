<?php

namespace App\Http\Controllers\Api;

use App\Models\Caja;
use App\Models\MovimientoCaja;
use Illuminate\Http\Request;
use App\Services\CajaService;
use Illuminate\Support\Facades\DB;
use App\Services\CajaReporteService;

class CajaController extends Controller
{
    public function index()
    {
        return Caja::where('usuario_id', auth()->id())
            ->where('fecha', now()->toDateString())
            ->first();
    }

    public function abrir(Request $request)
    {
        //Si hay una caja abierta, no permitir abrir otra
        $caja = Caja::where('fecha', now()->toDateString())
            ->where('estado', 'ABIERTA')
            ->first();
        if ($caja) {
            return response()->json([
                'error' => 'Ya existe una caja abierta'
            ], 400);
        }
        return Caja::create([
            'usuario_id' => auth()->id(),
            'fecha' => now()->toDateString(),
            'saldo_inicial' => $request->monto_apertura,
            'saldo_actual' => $request->monto_apertura,
            'estado' => 'ABIERTA'
        ]);
    }

    public function cerrar($id, CajaService $service, Request $request)
    {
        return DB::transaction(function () use ($id, $service, $request) {
            return $service->cerrarCaja($id, $request->all());
        });
    }

    public function getCaja()
    {
        return Caja::with(['usuario', 'movimientos' => function ($query) {
            $query->with('conciliador')->orderBy('created_at', 'desc');
        }])
            ->whereDate('fecha', now())
            ->where('estado', 'ABIERTA')
            ->latest('id')
            ->first();
    }

    public function obtenerMovimientos()
    {
        return MovimientoCaja::with(['caja.usuario', 'conciliador'])->orderBy('created_at', 'desc')->get();
    }

    public function obtenerEgresos()
    {
        return MovimientoCaja::with(['caja.usuario', 'conciliador'])
        ->where('tipo', 'EGRESO')
        ->orderBy('created_at', 'desc')->get();
    }

    public function updateEstadoEgreso(Request $request, $id)
    {
        return $this->conciliarMovimiento($request, $id);
    }

    public function conciliarMovimiento(Request $request, $id)
    {
        $request->validate([
            'estado' => 'required|string|in:APROBADO,RECHAZADO,PENDIENTE',
            'motivo' => 'nullable|string'
        ]);

        $movimiento = MovimientoCaja::findOrFail($id);

        if ($request->estado === 'APROBADO' && $movimiento->estado !== 'APROBADO') {
            if ($movimiento->tipo === 'EGRESO' && strtoupper($movimiento->metodo_pago ?? 'EFECTIVO') === 'EFECTIVO') {
                $caja = $movimiento->caja;

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
                    return response()->json(['error' => 'No se puede conciliar/aprobar el egreso porque el saldo en efectivo de la caja es 0.'], 400);
                }

                if ($movimiento->monto > $saldoDisponible) {
                    return response()->json(['error' => 'No se puede conciliar/aprobar el egreso porque supera el saldo en efectivo disponible (S/ ' . number_format($saldoDisponible, 2) . ').'], 400);
                }
            }
        }

        $movimiento->estado = $request->estado;
        if ($request->estado === 'PENDIENTE') {
            $movimiento->conciliado_by = null;
        } else {
            $movimiento->conciliado_by = auth()->id();
        }

        if ($request->estado === "RECHAZADO" && $request->filled('motivo')) {
            $movimiento->descripcion = $movimiento->descripcion . ' | RECHAZADO: ' . $request->motivo;
        } elseif ($request->estado === "PENDIENTE" && $request->filled('motivo')) {
            $movimiento->descripcion = $movimiento->descripcion . ' | ANULACIÓN: ' . $request->motivo;
        }

        $movimiento->save();

        // Si este movimiento pertenece a un gasto de vendedor, actualizar su estado
        if ($movimiento->referencia_tipo === 'GASTO' && $movimiento->referencia_id) {
            $gasto = \App\Models\Gasto::find($movimiento->referencia_id);
            if ($gasto) {
                if ($request->estado === 'APROBADO') {
                    $gasto->estado = 'CONFIRMADO';
                } elseif ($request->estado === 'RECHAZADO') {
                    $gasto->estado = 'RECHAZADO';
                } else {
                    $gasto->estado = 'PENDIENTE';
                }
                $gasto->save();
            }
        }

        return response()->json([
            'message' => $request->estado === 'PENDIENTE' ? 'Conciliación anulada / devuelta a pendiente correctamente.' : 'Movimiento conciliado correctamente.',
            'data' => $movimiento->load('caja.usuario', 'conciliador')
        ]);
    }

    public function crearMovimiento(Request $request, CajaService $service)
    {
        return DB::transaction(function () use ($request, $service) {
            return $service->registrarMovimiento($request->all());
        });
    }

    public function reporte($id, CajaReporteService $service)
    {
        return response()->json(
            $service->generarPorId($id)
        );
    }

    public function reportePorFecha(Request $request, CajaReporteService $service)
    {
        return response()->json(
            $service->generarPorUsuarioFecha(
                auth()->id(),
                $request->fecha
            )
        );
    }

    public function obtenerCajasCerradas()
    {
        //Buscar solo cajas donde exista un registro de cierre en la tabla cierres_caja.
        $caja = Caja::with(['usuarioCerrado','cierreCaja'])
            ->whereHas('cierreCaja')
            ->where('estado', 'CERRADA')
            ->orderBy('cerrado_at', 'desc')
            ->get();

        //Calcular sobrante o faltante
        foreach ($caja as $key => $value) {
            
            $total_ingresos = $value->movimientos()->where('tipo', 'INGRESO')->sum('monto');
            $total_egresos = $value->movimientos()
                ->where('tipo', 'EGRESO')
                ->where('estado', 'APROBADO')
                ->sum('monto');
        }

        return $caja;
    }

    public function cajasSinCerrar()
    {
        $cajas = Caja::where('estado', 'ABIERTA')
            ->where('fecha', '<', now()->toDateString())
            ->get();

        return response()->json([
            'cantidad' => $cajas->count(),
            'cajas' => $cajas
        ]);
    }

    public function cerrarAntiguas(CajaService $service)
    {
        return DB::transaction(function () use ($service) {
            $cajasCerradas = $service->cerrarCajasAntiguas();
            return response()->json([
                'message' => 'Cajas anteriores cerradas correctamente',
                'cantidad' => count($cajasCerradas),
                'cajas' => $cajasCerradas
            ]);
        });
    }
}
