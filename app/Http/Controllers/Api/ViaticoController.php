<?php

namespace App\Http\Controllers\Api;

use App\Models\Viatico;
use App\Services\CajaService;
use Illuminate\Http\Request;

class ViaticoController
{
    public function index()
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;

        $query = Viatico::with([
            'vendedor.usuario',
            'ruta',
            'salida'
        ])
        ->orderBy('fecha', 'desc');

        if ($vendedor) {
            $query->where('vendedor_id', $vendedor->id);
        }

        $viaticos = $query->get();
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
            'zona' => 'nullable|string|max:255',
            'ruta_id' => 'nullable|exists:rutas,id',
            'salida_id' => 'nullable|exists:salidas,id',
            'descripcion' => 'nullable|string|max:255',
        ]);

        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;
        $vendedorId = $vendedor ? $vendedor->id : $request->vendedor_id;

        $salidaId = $request->salida_id;
        if (!$salidaId) {
            $activeSalida = \App\Models\Salida::where('vendedor_id', $vendedorId)
                ->where('estado', 'EN RUTA')
                ->latest('id')
                ->first();
            if ($activeSalida) {
                $salidaId = $activeSalida->id;
            }
        }

        $viatico = Viatico::create([
            'vendedor_id' => $vendedorId,
            'tipo' => $request->tipo,
            'fecha' => $request->fecha,
            'monto' => $request->monto,
            'zona' => $request->zona,
            'ruta_id' => $request->ruta_id,
            'salida_id' => $salidaId,
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
        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $id) {
            $viatico = Viatico::findOrFail($id);
            $estadoAnterior = $viatico->estado;

            $viatico->estado = $request->estado;
            $viatico->save();

            // Si pasa a APROBADO desde PENDIENTE o RECHAZADO, registrar EGRESO
            if ($request->estado === 'APROBADO' && $estadoAnterior !== 'APROBADO' && $estadoAnterior !== 'LIQUIDADO') {
                CajaService::registrarMovimiento([
                    'tipo' => 'EGRESO',
                    'estado' => 'APROBADO',
                    'monto' => $viatico->monto,
                    'categoria' => 'VIATICO',
                    'descripcion' => 'Viatico ' . $viatico->tipo . ' para ' . ($viatico->vendedor?->usuario?->nombre ?? 'Vendedor') . ' - ' . $viatico->zona . '. Viatico #' . $viatico->id,
                    'referencia_tipo' => 'VIATICO',
                    'referencia_id' => $viatico->id
                ]);
            } else if (in_array($estadoAnterior, ['APROBADO', 'LIQUIDADO']) && in_array($request->estado, ['RECHAZADO', 'PENDIENTE'])) {
                // Si estaba APROBADO o LIQUIDADO y ahora es RECHAZADO/PENDIENTE, revertir con INGRESO
                CajaService::registrarMovimiento([
                    'tipo' => 'INGRESO',
                    'estado' => 'APROBADO',
                    'monto' => $viatico->monto,
                    'categoria' => 'REVERSION_VIATICO',
                    'descripcion' => 'Reversión por cambio de estado (' . $request->estado . ') de viático #' . $viatico->id,
                    'referencia_tipo' => 'VIATICO',
                    'referencia_id' => $viatico->id
                ]);
            }

            return response()->json($viatico);
        });
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
                'estado' => 'APROBADO',
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
        return \Illuminate\Support\Facades\DB::transaction(function () use ($id) {
            $viatico = Viatico::findOrFail($id);

            if (in_array($viatico->estado, ['APROBADO', 'LIQUIDADO'])) {
                CajaService::registrarMovimiento([
                    'tipo' => 'INGRESO',
                    'estado' => 'APROBADO',
                    'monto' => $viatico->monto,
                    'categoria' => 'REVERSION_VIATICO',
                    'descripcion' => 'Eliminación de viático #' . $viatico->id . ' (' . $viatico->tipo . ')',
                    'referencia_tipo' => 'VIATICO',
                    'referencia_id' => $viatico->id
                ]);
            }

            $viatico->delete();

            return response()->json([
                'message' => 'Viático eliminado correctamente',
                'viatico' => $viatico
            ]);
        });
    }
}
