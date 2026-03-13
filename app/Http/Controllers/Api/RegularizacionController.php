<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Regularizacion;
use App\Models\CierreCaja;
use App\Models\Caja;
use Carbon\Carbon;

class RegularizacionController
{
    public function index()
    {
        $regularizaciones = Regularizacion::with('cierreCaja.caja.usuario', 'usuarioAprobador')->get();
        return response()->json($regularizaciones);
    }

    //Obtener Cierre sin cuadrar por fecha
    public function getCierreSinCuadrarPorFecha(Request $request)
    {
        $request->validate([
            'fecha_cierre' => 'required|date',
        ]);

        //Obtener caja de ese dia por fecha 
        $caja = Caja::where('fecha', $request->fecha_cierre)->first();

        if($caja){
            $cierreCaja = CierreCaja::where('caja_id', $caja->id)->where('estado', '!=', 'CUADRADO')->first();

            if ($cierreCaja) {
                return response()->json($cierreCaja);
            } else {
                return response()->json([
                    'message' => 'No se encontro cierre de caja sin cuadrar',
                ]);
            }
        }else{
            return response()->json([
                'message' => 'No se encontro caja abierta',
            ]);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'cierre_caja_id' => 'required|exists:cierres_caja,id',
            'fecha_regularizacion' => 'required|date',
            'monto_cierre_original' => 'required|numeric',
            'monto_real' => 'required|numeric',
            'motivo' => 'required|string'
        ]);

        $regularizacion = Regularizacion::create([
            'cierre_caja_id' => $request->cierre_caja_id,
            'fecha_regularizacion' => $request->fecha_regularizacion,
            'monto_cierre_original' => $request->monto_cierre_original,
            'diferencia' => $request->monto_cierre_original - $request->monto_real,
            'monto_real' => $request->monto_real,
            'motivo' => $request->motivo,
            'estado' => 'PENDIENTE',
        ]);
        return response()->json($regularizacion);
    }

    public function updateEstado(Request $request, $id)
    {
        $request->validate([
            'estado' => 'required|string',
        ]);
        $regularizacion = Regularizacion::findOrFail($id);

        //Si aun hay diferencia, no se actualiza el conteo real en cierre_caja
        if ($regularizacion->cierreCaja->saldo_teorico - $regularizacion->monto_real != 0) {
            return response()->json([
                'message' => 'No se puede aprobar la regularización ya que aun hay diferencia',
                'regularizacion' => $regularizacion,
            ]);
        }

        if ($request->estado == 'APROBADO') {
            $regularizacion->update([
                'estado' => $request->estado,
                'aprobado_by' => auth()->user()->id,
                'aprobado_at' => Carbon::now(),
            ]);

            //Actualizar conteo real en cierre_caja, colocar diferencia en 0 y estado en CUADRADO
            $regularizacion->cierreCaja->update([
                'conteo_real' => $regularizacion->monto_real,
                'diferencia' => $regularizacion->cierreCaja->saldo_teorico - $regularizacion->monto_real,
                'estado' => 'CUADRADO',
            ]);
        } else {
            $regularizacion->update([
                'estado' => $request->estado,
            ]);
        }
        return response()->json($regularizacion);
    }
}
