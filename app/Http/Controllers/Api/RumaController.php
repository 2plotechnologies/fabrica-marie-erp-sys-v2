<?php

namespace App\Http\Controllers\Api;

use App\Models\Ruma;
use Illuminate\Http\Request;

class RumaController extends Controller
{
    public function index()
    {
        $rumas = Ruma::with('stock.producto')->get();

        $response = $rumas->map(function ($ruma) {

            $stockTotal = $ruma->stock->sum('cantidad');

            return [
                'id' => $ruma->id,
                'codigo' => $ruma->codigo,
                'nombre' => $ruma->nombre,
                'ubicacion_fisica' => $ruma->ubicacion_fisica,
                'capacidad' => $ruma->capacidad_unidades,
                'stockActual' => $stockTotal,
                'condiciones' => $ruma->condiciones,
                'estado' => $ruma->estado,
                'descripcion' => $ruma->descripcion,

                'products' => $ruma->stock->map(function ($stock) {
                    return [
                        'id' => $stock->producto->id,
                        'nombre' => $stock->producto->nombre,
                        'sku' => $stock->producto->sku,
                        'cantidad' => $stock->cantidad,
                    ];
                })->values()
            ];
        });

        return response()->json($response);
    }

    public function show($id)
    {
        $ruma = Ruma::with('stock.producto')->findOrFail($id);

        $stockTotal = $ruma->stock->sum('cantidad');

        return response()->json([
            'id' => $ruma->id,
            'codigo' => $ruma->codigo,
            'nombre' => $ruma->nombre,
            'ubicacion_fisica' => $ruma->ubicacion_fisica,
            'capacidad' => $ruma->capacidad_unidades,
            'stockActual' => $stockTotal,
            'condiciones' => $ruma->condiciones,
            'estado' => $ruma->estado,
            'descripcion' => $ruma->descripcion,

            'products' => $ruma->stock->map(function ($stock) {
                return [
                    'id' => $stock->producto->id,
                    'nombre' => $stock->producto->nombre,
                    'sku' => $stock->producto->sku,
                    'cantidad' => $stock->cantidad,
                ];
            })->values()
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'codigo' => 'required|string|max:20|unique:rumas,codigo',
            'nombre' => 'required|string|max:100',
            'descripcion' => 'nullable|string|max:255',
            'condiciones' => 'nullable|string|max:100',
            'capacidad_unidades' => 'required|integer|min:1',
            'ubicacion_fisica' => 'required|string|max:150',
            'estado' => 'required|in:ACTIVA,INACTIVA,MANTENIMIENTO,LLENA'
        ]);

        $ruma = Ruma::create([
            'codigo' => strtoupper($data['codigo']),
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'condiciones' => $data['condiciones'] ?? null,
            'capacidad_unidades' => $data['capacidad_unidades'],
            'ubicacion_fisica' => $data['ubicacion_fisica'],
            'estado' => $data['estado'],
        ]);

        return response()->json([
            'message' => 'Ruma creada correctamente',
            'data' => $ruma
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $ruma = Ruma::with('stock')->findOrFail($id);

        $data = $request->validate([
            'codigo' => 'required|string|max:20|unique:rumas,codigo,' . $ruma->id,
            'nombre' => 'required|string|max:100',
            'descripcion' => 'nullable|string|max:255',
            'condiciones' => 'nullable|string|max:100',
            'capacidad_unidades' => 'required|integer|min:1',
            'ubicacion_fisica' => 'required|string|max:150',
            'estado' => 'required|in:ACTIVA,INACTIVA'
        ]);

        // 🔥 Validar que la capacidad no sea menor al stock actual
        $stockActual = $ruma->stock->sum('cantidad');

        if ($data['capacidad_unidades'] < $stockActual) {
            return response()->json([
                'message' => 'La capacidad no puede ser menor al stock actual (' . $stockActual . ')'
            ], 422);
        }

        $ruma->update([
            'codigo' => strtoupper($data['codigo']),
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'condiciones' => $data['condiciones'] ?? null,
            'capacidad_unidades' => $data['capacidad_unidades'],
            'ubicacion_fisica' => $data['ubicacion_fisica'],
            'estado' => $data['estado'],
        ]);

        return response()->json([
            'message' => 'Ruma actualizada correctamente',
            'data' => $ruma
        ]);
    }

    public function destroy($id)
    {
        $ruma = Ruma::with('stock')->findOrFail($id);

        $stockActual = $ruma->stock->sum('cantidad');

        if ($stockActual > 0) {
            return response()->json([
                'message' => 'No se puede eliminar la ruma porque tiene stock registrado'
            ], 422);
        }

        $ruma->delete();

        return response()->json([
            'message' => 'Ruma eliminada correctamente'
        ]);
    }
}
