<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\ProyeccionVenta;
use Carbon\Carbon;

class ProyeccionVentaController
{

    public function index()
    {
        $data = DB::table('proyecciones_ventas as p')
            ->leftJoin('ventas as v', function ($join) {
                $join->on(
                    DB::raw("DATE_FORMAT(v.fecha, '%Y-%m')"),
                    '=',
                    DB::raw("DATE_FORMAT(p.mes, '%Y-%m')")
                )
                ->whereRaw("v.estado = 'CONFIRMADA'");
            })
            ->select(
                'p.id',
                DB::raw("DATE_FORMAT(p.mes, '%Y-%m') as mes"),
                'p.monto_proyectado as proyectado',
                DB::raw("COALESCE(SUM(v.total_neto), 0) as `real`"), // Fixed: escaped with backticks
                DB::raw("
                    ROUND(
                        (COALESCE(SUM(v.total_neto), 0) / NULLIF(p.monto_proyectado, 0)) * 100,
                        1
                    ) as porcentaje
                ")
            )
            ->groupBy('p.id', 'p.mes', 'p.monto_proyectado')
            ->orderByDesc('p.mes')
            ->get();

        return response()->json($data);
    }

    public function store(Request $request)
    {
        $request->validate([
            'mes' => 'required|date_format:Y-m',
            'monto' => 'required|numeric|min:0'
        ]);

        // Convertir a YYYY-MM-01
        $mes = Carbon::createFromFormat('Y-m', $request->mes)->startOfMonth();

        ProyeccionVenta::updateOrCreate(
            ['mes' => $mes],
            ['monto_proyectado' => $request->monto]
        );

        return response()->json([
            'success' => true
        ]);
    }

    //Si la fabrica lo requiere mas adelante.
    public function resumenMesActual()
    {
        $mesActual = now()->format('Y-m');

        $data = DB::table('proyecciones_ventas as p')
            ->leftJoin('ventas as v', function ($join) {
                $join->on(
                    DB::raw("DATE_FORMAT(v.fecha, '%Y-%m')"),
                    '=',
                    DB::raw("DATE_FORMAT(p.mes, '%Y-%m')")
                )
                ->where('v.estado', 'CONFIRMADA');
            })
            ->whereRaw("DATE_FORMAT(p.mes, '%Y-%m') = ?", [$mesActual])
            ->select(
                DB::raw("SUM(p.monto_proyectado) as proyectado"),
                DB::raw("COALESCE(SUM(v.total_neto), 0) as real"),
                DB::raw("
                    ROUND(
                        (COALESCE(SUM(v.total_neto), 0) / SUM(p.monto_proyectado)) * 100,
                        1
                    ) as porcentaje
                ")
            )
            ->first();

        return response()->json($data);
    }
}
