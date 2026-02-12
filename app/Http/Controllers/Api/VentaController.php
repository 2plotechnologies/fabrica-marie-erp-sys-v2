<?php

namespace App\Http\Controllers\Api;

use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\VentaItem;
use App\Services\VentaService;
use Exception;

class VentaController extends Controller
{
    public function index()
    {
        return Venta::with(['cliente', 'vendedor'])->get();
    }

    public function store(Request $request)
    {
        return DB::transaction(function () use ($request) {

            $venta = Venta::create($request->only([
                'codigo','vendedor_id','cliente_id',
                'fecha','total_neto','tipo_pago','estado'
            ]));

            foreach ($request->items as $item) {
                $venta->items()->create($item);
            }

            if ($venta->tipo_pago !== 'CONTADO') {
                $venta->cuenta()->create([
                    'cliente_id' => $venta->cliente_id,
                    'monto_total' => $venta->total_neto,
                    'saldo' => $venta->total_neto,
                    'estado' => 'PENDIENTE'
                ]);
            }

            return $venta->load('items');
        });
    }

    public function show($id)
    {
        $venta = Venta::with([
            'cliente',
            'vendedor.usuario',
            'items.producto',
            'movimientosStock',
            'movimientosCaja',
            'cuenta.abonos'
        ])->findOrFail($id);

        return response()->json([
            'venta' => $venta
        ]);
    }

    public function confirmar($id, StockService $stockService)
    {
        return DB::transaction(function () use ($id, $stockService) {

            $venta = Venta::with('items')
                ->lockForUpdate()
                ->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden confirmar ventas en borrador');
            }

            $permitirNegativo = auth()->user()->can('stock.negativo');

            foreach ($venta->items as $item) {

                $stock = StockActual::where('producto_id', $item->producto_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $disponible = $stock->cantidad - $stock->stock_reservado;

                /*
                ============================================
                🔒 VALIDACIÓN DE STOCK
                ============================================
                */

                if ($stock->stock_reservado < $item->cantidad) {

                    // No estaba correctamente reservado
                    if (!$permitirNegativo && $item->cantidad > $disponible) {
                        throw new Exception(
                            "Stock insuficiente para el producto {$item->producto_id}"
                        );
                    }
                }

                /*
                ============================================
                🔁 CONVERTIR RESERVA EN DESCUENTO REAL
                ============================================
                */

                $stock->cantidad -= $item->cantidad;

                if ($stock->stock_reservado >= $item->cantidad) {
                    $stock->stock_reservado -= $item->cantidad;
                }

                $stock->fecha_ultimo_mov = now();
                $stock->save();

                /*
                ============================================
                🧾 REGISTRAR MOVIMIENTO
                ============================================
                */

                MovimientoStock::create([
                    'tipo' => 'SALIDA',
                    'producto_id' => $item->producto_id,
                    'ruma_id' => $stock->ruma_id ?? null,
                    'cantidad' => $item->cantidad,
                    'referencia_tipo' => 'VENTA',
                    'referencia_id' => $venta->id,
                    'motivo' => 'Confirmación de venta',
                    'stock_post_mov' => $stock->cantidad,
                    'user_id' => auth()->id(),
                    'created_at' => now()
                ]);
            }

            $venta->estado = 'CONFIRMADA';
            $venta->save();

            return [
                'message' => 'Venta confirmada correctamente',
                'venta_id' => $venta->id
            ];
        });
    }

    public function reservarStock(Venta $venta)
    {
        foreach ($venta->items as $item) {

            $stock = StockActual::where('producto_id', $item->producto_id)
                ->lockForUpdate()
                ->first();

            $disponible = $stock->cantidad - $stock->stock_reservado;

            if ($item->cantidad > $disponible) {
                throw new Exception('Stock insuficiente para reservar');
            }

            $stock->stock_reservado += $item->cantidad;
            $stock->save();
        }
    }

    public function update(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {

            $venta = Venta::with('items')->lockForUpdate()->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden editar ventas en borrador');
            }

            // 🔁 Actualizar datos principales
            $venta->cliente_id = $request->cliente_id;
            $venta->tipo_pago = $request->tipo_pago;
            $venta->fecha = $request->fecha;
            $venta->save();

            // 🗑 Eliminar items anteriores
            $venta->items()->delete();

            $total = 0;

            foreach ($request->items as $item) {

                $subtotal = $item['cantidad'] * $item['precio_unitario'];

                $venta->items()->create([
                    'producto_id' => $item['producto_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                    'subtotal' => $subtotal
                ]);

                $total += $subtotal;
            }

            // 🔄 Recalcular total
            $venta->total_neto = $total;
            $venta->save();

            return [
                'message' => 'Venta actualizada correctamente',
                'venta_id' => $venta->id,
                'total_neto' => $venta->total_neto
            ];
        });
    }

    public function destroy($id, VentaService $ventaService)
    {
        return DB::transaction(function () use ($id) {

            $venta = Venta::with('items')->lockForUpdate()->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden eliminar ventas en borrador');
            }

            $ventaService->liberarReserva($venta);

            // Eliminar items
            $venta->items()->delete();

            // Eliminar venta
            $venta->delete();

            return [
                'message' => 'Venta eliminada correctamente'
            ];
        });
    }

    public function anular($id, VentaService $service)
    {
        return $service->anular($id, auth()->id());
    }
}
