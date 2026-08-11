<?php

namespace App\Http\Controllers\Api;

use App\Models\CuentaPorCobrar;
use Illuminate\Http\Request;

class CuentaPorCobrarController
{
    public function index()
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;

        $query = CuentaPorCobrar::with(['cliente', 'venta', 'abonos'])
            ->withSum(['abonos as monto_pagado_abonos' => function ($q) {
                $q->where(function ($sq) {
                    $sq->whereNull('estado')->orWhere('estado', '!=', 'ANULADO');
                });
            }], 'monto')
            ->orderBy('saldo', 'desc');

        if ($vendedor) {
            $query->whereHas('cliente', function ($q) use ($vendedor) {
                $q->where(function ($subQ) use ($vendedor) {
                    $subQ->whereHas('rutas', function ($sub) use ($vendedor) {
                        $sub->where('vendedor_id', $vendedor->id);
                    })->orWhereHas('ruta', function ($sub) use ($vendedor) {
                        $sub->where('vendedor_id', $vendedor->id);
                    });
                });
            });
        }

        $cuentas_por_cobrar = $query->get();

        $cuentas_por_cobrar->each(function($cuenta) {
            $adelanto = $cuenta->venta ? (float)$cuenta->venta->adelanto : 0;
            $monto_pagado_abonos = $cuenta->monto_pagado_abonos ? (float)$cuenta->monto_pagado_abonos : 0;
            $cuenta->monto_pagado = $monto_pagado_abonos + $adelanto;
        });

        return response()->json($cuentas_por_cobrar);
    }

    public function updateFechaVencimiento(Request $request, $id)
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        if ($isVendedor) {
            return response()->json(['message' => 'No autorizado para modificar la fecha de vencimiento.'], 403);
        }

        $cuenta_por_cobrar = CuentaPorCobrar::findOrFail($id);
        $cuenta_por_cobrar->fecha_vencimiento = $request->fecha_vencimiento;
        $cuenta_por_cobrar->save();
        return response()->json($cuenta_por_cobrar);
    }
}
