<?php

namespace App\Http\Controllers\Api;

use App\Models\Vehiculo;
use Illuminate\Http\Request;

class VehiculoController extends Controller
{
    public function index()
    {
        return response()->json(Vehiculo::where('activo', true)->get());
    }

    public function store(Request $request)
    {
        $vehiculo = Vehiculo::create($request->all());

        return response()->json($vehiculo, 201);
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
