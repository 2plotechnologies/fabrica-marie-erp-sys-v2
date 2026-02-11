<?php

namespace App\Http\Controllers\Api;

use App\Models\Ruta;
use Illuminate\Http\Request;

class RutaController extends Controller
{
    public function index()
    {
        return response()->json(
            Ruta::where('activo', true)->get()
        );
    }

    public function store(Request $request)
    {
        $ruta = Ruta::create($request->all());
        return response()->json($ruta, 201);
    }

    public function show($id)
    {
        return response()->json(
            Ruta::with('clientes')->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $ruta = Ruta::findOrFail($id);
        $ruta->update($request->all());

        return response()->json($ruta);
    }

    public function destroy($id)
    {
        $ruta = Ruta::findOrFail($id);
        $ruta->activo = false;
        $ruta->save();

        return response()->json(['message' => 'Ruta desactivada']);
    }

    // Asignar clientes con orden
    public function asignarClientes(Request $request, $rutaId)
    {
        $ruta = Ruta::findOrFail($rutaId);

        /*
          Espera:
          [
            { "cliente_id": 1, "orden": 1 },
            { "cliente_id": 2, "orden": 2 }
          ]
        */

        $syncData = [];
        foreach ($request->clientes as $item) {
            $syncData[$item['cliente_id']] = ['orden' => $item['orden']];
        }

        $ruta->clientes()->sync($syncData);

        return response()->json(['message' => 'Clientes asignados a la ruta']);
    }
}
