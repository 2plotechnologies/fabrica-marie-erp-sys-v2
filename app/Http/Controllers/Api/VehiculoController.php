<?php

namespace App\Http\Controllers\Api;

use App\Models\Vehiculo;
use App\Models\Vendedor;
use Illuminate\Http\Request;

class VehiculoController extends Controller
{
    public function index()
    {
        return response()->json(
            Vehiculo::where('activo', true)
                ->with(['mantenimientos' => function ($query) {
                    $query->orderByDesc('fecha_programada');
                }])
                ->get()
        );
    }

    public function store(Request $request)
    {
        $vehiculo = Vehiculo::create($request->all());

        return response()->json($vehiculo, 201);
    }

    public function assignVendedor(Request $request, $id)
    {
        $vehiculo = Vehiculo::findOrFail($id);
        $vendedor = Vendedor::where('id', $request->vendedor_id)->first();
        //Validar que ya se asigno el vehiculo al vendedor
        if ($vendedor->vehiculos()->where('vehiculo_id', $id)->exists()) {
            return response()->json(['message' => 'El vehiculo ya se encuentra asignado al vendedor'], 400);
        }
        $vendedor->vehiculos()->attach($id);
        $vendedor->save();
        return response()->json($vehiculo);
    }

    public function show($id)
    {
        return response()->json(
            Vehiculo::with('gpsPoints')->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $vehiculo = Vehiculo::findOrFail($id);
        $vehiculo->update($request->all());

        return response()->json($vehiculo);
    }

    public function destroy($id)
    {
        $vehiculo = Vehiculo::findOrFail($id);
        $vehiculo->activo = false;
        $vehiculo->save();

        return response()->json(['message' => 'Vehículo desactivado']);
    }
}
