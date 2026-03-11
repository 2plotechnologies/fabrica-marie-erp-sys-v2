<?php

namespace App\Http\Controllers\Api;

use App\Models\CuentaPorCobrar;
use Illuminate\Http\Request;

class CuentaPorCobrarController
{
    public function index()
    {
        //Sumar todos los abonos y crear un nuevo campo monto_pagado.
        $cuentas_por_cobrar = CuentaPorCobrar::with('cliente', 'venta', 'abonos')->get();
        foreach ($cuentas_por_cobrar as $cuenta_por_cobrar) {
            $cuenta_por_cobrar->monto_pagado = $cuenta_por_cobrar->abonos->sum('monto');
        }
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
