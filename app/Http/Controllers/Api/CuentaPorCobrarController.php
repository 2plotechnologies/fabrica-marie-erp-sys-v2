<?php

namespace App\Http\Controllers\Api;

use App\Models\CuentaPorCobrar;
use Illuminate\Http\Request;

class CuentaPorCobrarController
{
    public function index()
    {
        $cuentas_por_cobrar = CuentaPorCobrar::with(['cliente', 'venta', 'abonos'])
            ->withSum('abonos as monto_pagado_abonos', 'monto')
            ->orderBy('saldo', 'desc')
            ->get();

        $cuentas_por_cobrar->each(function($cuenta) {
            $adelanto = $cuenta->venta ? (float)$cuenta->venta->adelanto : 0;
            $monto_pagado_abonos = $cuenta->monto_pagado_abonos ? (float)$cuenta->monto_pagado_abonos : 0;
            $cuenta->monto_pagado = $monto_pagado_abonos + $adelanto;
        });

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
