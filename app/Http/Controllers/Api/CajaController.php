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
        return Caja::with(['usuario', 'movimientos'])
            ->whereDate('fecha', now())
            ->where('estado', 'ABIERTA')
            ->latest('id')
            ->first();
    }

    public function abrir(Request $request)
    {
        return Caja::create([
            'usuario_id' => auth()->id(),
            'fecha' => now()->toDateString(),
            'saldo_inicial' => $request->monto_apertura,
            'saldo_actual' => $request->monto_apertura,
            'estado' => 'ABIERTA'
        ]);
    }

    public function cerrar($id, CajaService $service)
    {
        return DB::transaction(function () use ($id, $service) {
            return $service->cerrarCaja($id);
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

    public function obtenerCajasCerradas()
    {
        $caja = Caja::with(['usuarioCerrado'])
            ->where('estado', 'CERRADA')
            ->orderBy('cerrado_at', 'desc')
            ->get();

        //Calcular sobrante o faltante
        foreach ($caja as $key => $value) {
            
            $total_ingresos = $value->movimientos()->where('tipo', 'INGRESO')->sum('monto');
            $total_egresos = $value->movimientos()->where('tipo', 'EGRESO')->sum('monto');            
        }

        return $caja;
    }
}
