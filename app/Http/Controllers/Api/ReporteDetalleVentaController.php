<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Venta;
use App\Models\VentaItem;

class ReporteDetalleVentaController
{
     public function detalleVentas(Request $request)
    {

        $fechaInicio = $request->input('fechaInicio');
        $fechaFin = $request->input('fechaFin');

        $ventasQuery = Venta::with([
            'cliente.ruta',
            'vendedor.usuario',
            'items.producto',
            'items.salida.vehiculo'
        ])->where('estado', 'CONFIRMADA');

        if ($fechaInicio && $fechaFin) {
            $ventasQuery->whereBetween('fecha', [$fechaInicio, $fechaFin]);
        }

        $ventas = $ventasQuery->get();

        $resultadoVentas = [];

        foreach ($ventas as $venta) {

            $itemsVenta = [];

            $subtotal = 0;
            $totalBonificacion = 0;
            $totalDegustacion = 0;

            foreach ($venta->items as $item) {

                $precio = $item->precio_unitario ?? 0;
                $cantidad = $item->cantidad ?? 0;
                $totalItem = $precio * $cantidad;

                if ($item->es_bonificacion) {
                    $totalBonificacion += $cantidad;
                }

                if ($item->es_degustacion) {
                    $totalDegustacion += $cantidad;
                }

                if (!$item->es_bonificacion && !$item->es_degustacion) {
                    $subtotal += $totalItem;
                }

                $presentacionNombre = null;

                if ($item->producto) {
                    $presentacionNombre = $item->producto->nombre;

                    if ($item->producto->presentacion) {
                        $presentacionNombre .= " " . $item->producto->presentacion;
                    }
                }

                $itemsVenta[] = [
                    "id" => (string)$item->id,
                    "presentacion" => $presentacionNombre,
                    "cantidad" => $cantidad,
                    "precio" => $precio,
                    "total" => $totalItem,
                    "bonificacion" => (bool)$item->es_bonificacion,
                    "degustacion" => (bool)$item->es_degustacion,
                    "condicionVenta" => $venta->tipo_pago,
                    "notaPedido" => $venta->codigo,
                    "tipoCliente" => $venta->cliente->tipo_cliente ?? null
                ];
            }

            $vehiculo = optional($venta->items->first()?->salida?->vehiculo);

            $resultadoVentas[] = [

                "id" => (string)$venta->id,
                "fecha" => $venta->fecha,

                "vehiculoId" => $vehiculo->id ?? null,
                "vehiculoPlaca" => $vehiculo->placa ?? null,

                "vendedor" => $venta->vendedor->usuario->nombre ?? null,
                "vendedorId" => $venta->vendedor->id ?? null,

                "cliente" => $venta->cliente->razon_social ?? null,
                "clienteId" => (string)($venta->cliente->id ?? null),

                "items" => $itemsVenta,

                "subtotal" => $subtotal,
                "totalBonificacion" => $totalBonificacion,
                "totalDegustacion" => $totalDegustacion,

                "total" => $venta->total_neto,

                "condicionVenta" => $venta->tipo_pago,

                "notaPedido" => $venta->codigo,

                "tipoCliente" => $venta->cliente->tipo_cliente ?? null,

                "createdAt" => $venta->fecha
            ];
        }

        /*
        ============================
        PROMOCIONES / DEGUSTACIONES
        ============================
        */

        $itemsPromocion = VentaItem::where(function ($q) {
            $q->where('es_bonificacion', true)
                ->orWhere('es_degustacion', true);
        })
        ->with([
            'venta.cliente.ruta',
            'venta.vendedor.usuario',
            'producto',
            'salida.vehiculo'
        ])
        ->get();

        $promociones = [];

        foreach ($itemsPromocion as $item) {

            $venta = $item->venta;

            if (!$venta) continue;

            $vehiculo = optional($item->salida?->vehiculo);

            $precio = $item->producto->precio_base ?? 0;
            $cantidad = $item->cantidad ?? 0;

            $productoNombre = null;

            if ($item->producto) {
                $productoNombre = $item->producto->nombre;

                if ($item->producto->presentacion) {
                    $productoNombre .= " " . $item->producto->presentacion;
                }
            }

            $promociones[] = [

                "id" => (string)$item->id,

                "fecha" => $venta->fecha,

                "vendedor" => $venta->vendedor->usuario->nombre ?? null,
                "vendedorId" => $venta->vendedor->id ?? null,

                "vehiculoPlaca" => $vehiculo->placa ?? null,

                "cliente" => $venta->cliente->razon_social ?? null,
                "clienteId" => (string)($venta->cliente->id ?? null),

                "tipoCliente" => $venta->cliente->tipo_cliente ?? null,

                "producto" => $productoNombre,

                "tipo" => $item->es_degustacion ? "DEGUSTACION" : "PROMOCION",

                "cantidad" => $cantidad,

                "valorEstimado" => $precio * $cantidad,

                "motivo" => null,

                "ruta" => $venta->cliente->ruta->nombre ?? null,

                "diaRuta" => null
            ];
        }

        return response()->json([
            "ventas" => $resultadoVentas,
            "promociones" => $promociones
        ]);
    }
}
