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

    public function getCaja()
    {
        //Ordenar movimientos por fecha
        return Caja::with(['usuario', 'movimientos' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }])
            ->whereDate('fecha', now())
            ->where('estado', 'ABIERTA')
            ->latest('id')
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

    public function obtenerMovimientos()
    {
        return MovimientoCaja::with(['caja.usuario'])->orderBy('created_at', 'desc')->get();
    }

    public function obtenerEgresos()
    {
        return MovimientoCaja::with(['caja.usuario'])
        ->where('tipo', 'EGRESO')
        ->orderBy('created_at', 'desc')->get();
    }

    public function updateEstadoEgreso(Request $request, $id)
    {
        $movimiento = MovimientoCaja::findOrFail($id);

        if ($request->estado === 'APROBADO' && $movimiento->estado !== 'APROBADO') {
            $caja = $movimiento->caja;
            $ingresos = MovimientoCaja::where('caja_id', $caja->id)
                ->where('tipo', 'INGRESO')
                ->sum('monto');
                
            $egresos = MovimientoCaja::where('caja_id', $caja->id)
                ->where('tipo', 'EGRESO')
                ->where('estado', 'APROBADO')
                ->sum('monto');
                
            $saldoActual = $caja->saldo_inicial + $ingresos - $egresos;

            if ($saldoActual <= 0) {
                return response()->json(['error' => 'No se puede aprobar el egreso porque el saldo actual de la caja es 0.'], 400);
            }

            if ($movimiento->monto > $saldoActual) {
                return response()->json(['error' => 'No se puede aprobar el egreso porque el monto supera el saldo actual. Saldo disponible: ' . number_format($saldoActual, 2)], 400);
            }
        }

        $movimiento->estado = $request->estado;
        if($request->estado === "RECHAZADO"){
            $movimiento->descripcion = 'EGRESO RECHAZADO: ' . $request->motivo;
        }
        $movimiento->save();
        
        return response()->json(['message' => 'Estado actualizado correctamente.']);
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
}
