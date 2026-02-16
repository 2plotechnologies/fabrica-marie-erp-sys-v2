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
        $validated = $request->validate([
            'codigo_cliente' => 'required|string|unique:clientes',
            'razon_social' => 'required|string',
            'tipo_cliente' => 'nullable|in:TIENDA,DISTRIBUIDOR,MAYORISTA,CONSUMIDOR',
            'direccion' => 'nullable|string',
            'telefono' => 'nullable|string',
            'ruta_id' => 'nullable|exists:rutas,id',
            'condicion_pago' => 'required|in:CONTADO,CREDITO',
            'limite_credito' => 'numeric',
            'dias_credito' => 'numeric',
            'activo' => 'boolean'
        ]);

        $cliente = Cliente::create($validated);

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
