<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Services\DevolucionService;

class DevolucionController
{
    public function store(Request $request, DevolucionService $devolucionService)
    {
        $request->validate([
            'fecha' => 'required|date',
            'vendedor_id' => 'required|exists:vendedores,id',
            'tipo' => 'required|in:BUENA,MALA',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1'
        ]);

        $devolucion = $devolucionService->registrar($request->all());

        return response()->json([
            'message' => 'Devolución registrada correctamente',
            'data' => $devolucion
        ]);
    }
}
