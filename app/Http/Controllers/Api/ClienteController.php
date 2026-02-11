<?php

namespace App\Http\Controllers\Api;

use App\Models\Cliente;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    public function index()
    {
        return response()->json(
            Cliente::where('activo', true)->with('ruta')->get()
        );
    }

    public function store(Request $request)
    {
        $cliente = Cliente::create($request->all());
        return response()->json($cliente, 201);
    }

    public function show($id)
    {
        return response()->json(
            Cliente::with(['ruta', 'rutas'])->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->update($request->all());

        return response()->json($cliente);
    }

    public function destroy($id)
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->activo = false;
        $cliente->save();

        return response()->json(['message' => 'Cliente desactivado']);
    }
}
