<?php

namespace App\Http\Controllers\Api;

use App\Models\Caja;
use Illuminate\Http\Request;
use App\Services\CajaService;
use Illuminate\Support\Facades\DB;
use App\Services\CajaReporteService;

class CajaController extends Controller
{
    public function abrir(Request $request)
    {
        return Caja::create([
            'usuario_id' => auth()->id(),
            'fecha' => now()->toDateString(),
            'saldo_inicial' => $request->saldo_inicial,
            'saldo_actual' => $request->saldo_inicial,
            'estado' => 'ABIERTA'
        ]);
    }

    public function cerrar($id, CajaService $service)
    {
        return DB::transaction(function () use ($id, $service) {
            return $service->cerrarCaja($id);
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
    }
