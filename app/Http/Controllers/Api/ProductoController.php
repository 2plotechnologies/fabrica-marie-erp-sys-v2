<?php

namespace App\Http\Controllers\Api;

use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;


class ProductoController extends Controller
{
    public function index()
    {
        return response()->json(
            Producto::where('activo', true)->get()
        );
    }

    public function store(Request $request)
    {
        $producto = Producto::create($request->all());

        return response()->json($producto, 201);
    }

    public function show($id)
    {
        return response()->json(
            Producto::with('stock')->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $producto = Producto::findOrFail($id);
        $producto->update($request->all());

        return response()->json($producto);
    }

    public function stockMinimo()
    {
        $productos = DB::table('productos as p')
            ->join('stock_actual as s', 'p.id', '=', 's.producto_id')
            ->select(
                'p.id',
                'p.nombre',
                'p.stock_minimo',
                DB::raw('SUM(s.cantidad) as stock_actual')
            )
            ->where('p.activo', true)
            ->groupBy('p.id', 'p.nombre', 'p.stock_minimo')
            ->havingRaw('SUM(s.cantidad) <= p.stock_minimo')
            ->get();

        return response()->json($productos);
    }

    public function destroy($id)
    {
        $producto = Producto::findOrFail($id);
        $producto->activo = false;
        $producto->save();

        return response()->json(['message' => 'Producto desactivado']);
    }
}
