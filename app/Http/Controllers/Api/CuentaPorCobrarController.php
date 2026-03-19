<?php

namespace App\Http\Controllers\Api;

use App\Models\CuentaPorCobrar;
use Illuminate\Http\Request;

class CuentaPorCobrarController
{
    public function index()
    {
        $cuentas_por_cobrar = CuentaPorCobrar::with(['cliente', 'venta', 'abonos'])
            ->withSum('abonos as monto_pagado', 'monto')
            ->orderByRaw('(monto_total - COALESCE(monto_pagado, 0)) DESC')
            ->get();

        return response()->json($cuentas_por_cobrar);
    }

    public function updateFechaVencimiento(Request $request, $id)
    {
        $cuenta_por_cobrar = CuentaPorCobrar::findOrFail($id);
        $cuenta_por_cobrar->fecha_vencimiento = $request->fecha_vencimiento;
        $cuenta_por_cobrar->save();
        return response()->json($cuenta_por_cobrar);
    }
}
