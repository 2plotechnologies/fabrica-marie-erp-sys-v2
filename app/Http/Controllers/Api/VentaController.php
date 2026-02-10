<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    public function confirmar($id, StockService $stockService)
    {
        return DB::transaction(function () use ($id, $stockService) {

            $venta = Venta::with('items')->lockForUpdate()->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden confirmar ventas en borrador');
            }

            foreach ($venta->items as $item) {
                $stockService->descontarStock(
                    $item->producto_id,
                    $item->cantidad,
                    $venta->id,
                    auth()->id()
                );
            }

            $venta->estado = 'CONFIRMADA';
            $venta->save();

            return [
                'message' => 'Venta confirmada correctamente',
                'venta_id' => $venta->id
            ];
        });
    }
}
