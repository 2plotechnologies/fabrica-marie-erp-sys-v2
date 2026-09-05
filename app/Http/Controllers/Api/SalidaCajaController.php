<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\SalidaCaja;
use App\Models\Caja;
use App\Services\CajaService;

class SalidaCajaController
{
    //Listar todas las salidas.
    public function index(){

         $salidas = SalidaCaja::with([
            'caja',
            'usuario',
            'usuario_liquido'
        ])
        ->orderBy('fecha', 'desc')
        ->get();

        return response()->json($salidas);

    }

    //Crear Salida
    public function store(Request $request){
        $request->validate([
            'destinatario' => 'required|string|max:255',
            'motivo' => 'required|string',
            'entregado' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string|max:255',
        ]);

        // Obtener caja abierta
        $caja = Caja::where('estado', 'ABIERTA')->first();

        if (!$caja) {
            return response()->json([
                'message' => 'No existe una caja abierta'
            ], 400);
        }

        $salida = SalidaCaja::create([
            'caja_id' => $caja->id,
            'fecha' => now(),
            'destinatario' => $request->destinatario,
            'motivo' => $request->motivo,
            'entregado' => $request->entregado,
            'estado' => 'PENDIENTE',
            'observaciones' => $request->observaciones,
            'registrado_by' => auth()->id()
        ]);

        return response()->json([
            'message' => 'Salida registrada correctamente',
            'data' => $salida
        ], 201);
    }

    //Aprobar Salida
    public function entregar($id){
        $salida = SalidaCaja::findOrFail($id);
        $salida->estado = "ENTREGADO";
        $salida->save();

        //Registrar movimiento en caja al aprobar salida
        $movimiento = CajaService::registrarMovimiento([
            'tipo' => 'EGRESO',
            'estado' => 'APROBADO',
            'monto' => $salida->entregado,
            'categoria' => 'SALIDA',
            'descripcion' => 'Salida aprobada. Salida #' . $salida->id,
            'referencia_tipo' => 'SALIDA',
            'referencia_id' => $salida->id
        ]);

        return response()->json([
            'message' => 'Salida entregada correctamente',
            'data' => $salida
        ]);
    }

    //Liquidar Salida
    public function liquidar(Request $request, $id){
        $request->validate([
            'usado' => 'required|numeric|min:0',
            'vuelto' => 'required|numeric|min:0',
            'comprobante' => 'required|string|max:50'
        ]);

        $salida = SalidaCaja::findOrFail($id);

        if ($salida->estado === 'LIQUIDADO') {
            return response()->json([
                'message' => 'Esta salida ya fue liquidada'
            ], 400);
        }

        if(($request->usado + $request->vuelto) != $salida->entregado){
            return response()->json([
                'message' => 'La suma de usado y vuelto debe ser igual al monto entregado'
        ], 400);
}

        $comprobanteFinal = $request->filled('tipo_comprobante') 
            ? $request->tipo_comprobante . ' - ' . $request->comprobante 
            : $request->comprobante;

        $salida->update([
            'usado' => $request->usado,
            'vuelto' => $request->vuelto,
            'estado' => 'LIQUIDADO',
            'comprobante' => $comprobanteFinal,
            'liquidado_by' => auth()->id()
        ]);

        // Actualizar el comprobante en el movimiento original (EGRESO) de la salida
        \App\Models\MovimientoCaja::where('referencia_tipo', 'SALIDA')
            ->where('referencia_id', $id)
            ->where('tipo', 'EGRESO')
            ->update(['comprobante' => $comprobanteFinal]);

        if($request->vuelto > 0){
            $movimiento = CajaService::registrarMovimiento([
                'tipo' => 'INGRESO',
                'estado' => 'APROBADO',
                'monto' => $request->vuelto,
                'categoria' => 'VUELTO',
                'descripcion' => 'Salida Liquidada. Salida #' . $salida->id,
                'referencia_tipo' => 'SALIDA',
                'referencia_id' => $id,
                'comprobante' => $comprobanteFinal
            ]);
        }

        return response()->json([
            'message' => 'Salida liquidada correctamente',
            'data' => $salida
        ]);
    }
}
