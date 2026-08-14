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

        $salidaEnRuta = null;
        if ($vendedor) {
            $salidaEnRuta = \App\Models\Salida::with(['ruta', 'rutas'])
                ->where('vendedor_id', $vendedor->id)
                ->where('estado', 'EN_RUTA')
                ->first();
        }

        $query = CuentaPorCobrar::select('cuentas_por_cobrar.*')
        ->with([
            'cliente.ruta',
            'cliente.rutas',
            'venta.vendedor.usuario',
            'abonos'
        ])
        ->withSum(['abonos as monto_pagado_abonos' => function ($q) {
            $q->where(function ($sq) {
                $sq->whereNull('estado')->orWhere('estado', '!=', 'ANULADO');
            });
        }], 'monto')
        ->join('ventas', 'cuentas_por_cobrar.venta_id', '=', 'ventas.id');

        $activeZona = $salidaEnRuta ? $salidaEnRuta->zona : null;
        $activeRutaIds = [];
        if ($salidaEnRuta) {
            if ($salidaEnRuta->ruta_id) {
                $activeRutaIds[] = (int)$salidaEnRuta->ruta_id;
            }
            if ($salidaEnRuta->rutas) {
                foreach ($salidaEnRuta->rutas as $r) {
                    $activeRutaIds[] = (int)$r->id;
                }
            }
            $activeRutaIds = array_values(array_unique($activeRutaIds));
        }

        $cuentas_por_cobrar = $query->get();

        $cuentas_por_cobrar->each(function($cuenta) use ($activeZona, $activeRutaIds) {
            $adelanto = $cuenta->venta ? (float)$cuenta->venta->adelanto : 0;
            $monto_pagado_abonos = $cuenta->abonos ? (float)$cuenta->abonos->filter(function($abono) {
                return empty($abono->estado) || strtoupper($abono->estado) !== 'ANULADO';
            })->sum('monto') : 0;
            $cuenta->monto_pagado = $monto_pagado_abonos + $adelanto;

            $clienteRuta = $cuenta->cliente?->ruta;
            $clienteRutas = $cuenta->cliente?->rutas;

            $cuentaZona = $clienteRuta?->zona;
            if (!$cuentaZona && $clienteRutas && $clienteRutas->count() > 0) {
                $cuentaZona = $clienteRutas->first()->zona;
            }

            $cuentaRutaId = $cuenta->cliente?->ruta_id;
            if (!$cuentaRutaId && $clienteRutas && $clienteRutas->count() > 0) {
                $cuentaRutaId = $clienteRutas->first()->id;
            }

            $esZonaActual = false;
            if ($activeZona && $cuentaZona && strtoupper(trim($cuentaZona)) === strtoupper(trim($activeZona))) {
                $esZonaActual = true;
            }

            $esRutaActual = false;
            if (!empty($activeRutaIds) && $cuentaRutaId && in_array((int)$cuentaRutaId, $activeRutaIds)) {
                $esRutaActual = true;
            }

            $cuenta->es_zona_actual = $esZonaActual;
            $cuenta->es_ruta_actual = $esRutaActual;
            $cuenta->zona_nombre = $cuentaZona ?? 'Sin Zona';
            $cuenta->ruta_nombre = $clienteRuta?->nombre ?? ($clienteRutas && $clienteRutas->count() > 0 ? $clienteRutas->first()->nombre : 'Sin Ruta');
        });

        $hasActiveSalida = $salidaEnRuta !== null && !($vendedor && $vendedor->venta_directa && !$vendedor->venta_en_ruta);

        $sorted = $cuentas_por_cobrar->sort(function($a, $b) use ($hasActiveSalida) {
            // Cuentas activas primero, cuentas pagadas al final
            $isPaidA = strtoupper($a->estado) === 'PAGADO';
            $isPaidB = strtoupper($b->estado) === 'PAGADO';

            if ($isPaidA !== $isPaidB) {
                return $isPaidA ? 1 : -1;
            }

            if ($hasActiveSalida) {
                if ($a->es_ruta_actual !== $b->es_ruta_actual) {
                    return $a->es_ruta_actual ? -1 : 1;
                }
                if ($a->es_zona_actual !== $b->es_zona_actual) {
                    return $a->es_zona_actual ? -1 : 1;
                }
                if ($a->zona_nombre !== $b->zona_nombre) {
                    return strcmp($a->zona_nombre, $b->zona_nombre);
                }
                if ($a->ruta_nombre !== $b->ruta_nombre) {
                    return strcmp($a->ruta_nombre, $b->ruta_nombre);
                }
            }

            $fechaA = $a->venta ? $a->venta->fecha : '';
            $fechaB = $b->venta ? $b->venta->fecha : '';
            if ($fechaA !== $fechaB) {
                return strcmp($fechaA, $fechaB);
            }
            return $a->id - $b->id;
        })->values();

        return response()->json($sorted);
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
