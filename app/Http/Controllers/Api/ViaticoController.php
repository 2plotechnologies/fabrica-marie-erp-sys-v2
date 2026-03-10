<?php

namespace App\Http\Controllers\Api;

use App\Models\Viatico;
use App\Services\CajaService;
use Illuminate\Http\Request;

class ViaticoController
{
    public function index()
    {
        $viaticos = Viatico::with([
            'vendedor.usuario',
            'ruta'
        ])->get();
        return response()->json($viaticos);
    }

    public function store(Request $request)
    {
        //Validar datos
        $request->validate([
            'vendedor_id' => 'required|exists:vendedores,id',
            'tipo' => 'required|string|in:inicial,viaje',
            'fecha' => 'required|date',
            'monto' => 'required|numeric',
            'zona' => 'required|string|max:255',
            'ruta_id' => 'required|exists:rutas,id',
            'descripcion' => 'nullable|string|max:255',
        ]);

        $viatico = Viatico::create([
            'vendedor_id' => $request->vendedor_id,
            'tipo' => $request->tipo,
            'fecha' => $request->fecha,
            'monto' => $request->monto,
            'zona' => $request->zona,
            'ruta_id' => $request->ruta_id,
            'descripcion' => $request->descripcion,
            'estado' => 'PENDIENTE',
        ]);
        return response()->json($viatico);
    }

    public function show($id)
    {
        $viatico = Viatico::find($id);
        return response()->json($viatico);
    }

    public function update(Request $request, $id)
    {
        $viatico = Viatico::find($id);
        $viatico->update($request->all());
        return response()->json($viatico);
    }

    public function updateEstado(Request $request, $id)
    {
        $viatico = Viatico::findOrFail($id);
        $viatico->estado = $request->estado;
        $viatico->save();

        //Si el estado es aprobado, se debe registrar el movimiento en caja.
        if ($viatico->estado == 'APROBADO') {
            $movimiento = CajaService::registrarMovimiento([
                'tipo' => 'EGRESO',
                'monto' => $viatico->monto,
                'categoria' => 'VIATICO',
                'descripcion' => 'Viatico ' . $viatico->tipo . ' para ' . $viatico->vendedor->usuario->nombre . ' - ' . $viatico->zona . '. Viatico #' . $viatico->id,
                'referencia_tipo' => 'VIATICO',
                'referencia_id' => $viatico->id
            ]);
        }

        return response()->json($viatico);
    }

    //Liquidar viatico.
    public function liquidar(Request $request, $id){
        $request->validate([
            'usado' => 'required|numeric|min:0',
            'vuelto' => 'required|numeric|min:0',
            'comprobante' => 'required|string|max:50'
        ]);

        $viatico = Viatico::findOrFail($id);

        if ($viatico->estado === 'LIQUIDADO') {
            return response()->json([
                'message' => 'Este viatico ya fue liquidado.'
            ], 400);
        }

        if(($request->usado + $request->vuelto) != $viatico->monto){
            return response()->json([
                'message' => 'La suma de usado y vuelto debe ser igual al monto entregado.'
        ], 400);
}

        $viatico->update([
            'usado' => $request->usado,
            'vuelto' => $request->vuelto,
            'estado' => 'LIQUIDADO',
            'comprobante' => $request->comprobante,
            'liquidado_by' => auth()->id()
        ]);

        if($request->vuelto > 0){
            $movimiento = CajaService::registrarMovimiento([
                'tipo' => 'INGRESO',
                'monto' => $request->vuelto,
                'categoria' => 'VUELTO',
                'descripcion' => 'Viatico Liquidado. Viatico #' . $viatico->id,
                'referencia_tipo' => 'VIATICO',
                'referencia_id' => $id
            ]);
        }

        return response()->json([
            'message' => 'Viatico liquidado correctamente',
            'data' => $viatico
        ]);
    }

    public function destroy($id)
    {
        $viatico = Viatico::find($id);
        $viatico->delete();
        return response()->json($viatico);
    }
}
