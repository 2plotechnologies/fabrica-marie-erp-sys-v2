<?php

namespace App\Http\Controllers\Api;

use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;


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
        $validated = $request->validate([
            'sku' => 'required|string|max:50|unique:productos,sku',
            'categoria' => 'required|string|max:100',
            'nombre' => 'required|string|max:150',
            'descripcion' => 'nullable|string',
            'presentacion' => 'nullable|string|max:100',
            'marca' => 'required|string|max:100',
            'unidad_medida' => 'required|string|max:50',
            'precio_base' => 'required|numeric|min:0',
            'costo' => 'required|numeric|min:0',
            'stock_minimo' => 'required|integer|min:0',
            'activo' => 'required|boolean',
        ]);

        $validated['created_at'] = Carbon::now();
        $validated['created_by'] = Auth::id();

        $producto = Producto::create($validated);

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
