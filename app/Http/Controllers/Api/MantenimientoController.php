<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Vehiculo;
use App\Models\Mantenimiento;
use Illuminate\Support\Facades\DB;

class MantenimientoController
{
    public function index()
    {
        return response()->json(Mantenimiento::with('vehiculo')->get());
    }

    public function show($id)
    {
        return response()->json(Mantenimiento::with('vehiculo')->findOrFail($id));
    }

    public function store(Request $request)
    {
        $request->validate([
            'tipo' => 'required|string|in:PREVENTIVO,CORRECTIVO',
            'descripcion' => 'required|string|max:255',
            'fecha_programada' => 'required|date',
            'costo_estimado' => 'required|numeric|min:0',
            'taller' => 'required|string|max:255',
            'vehiculo_id' => 'required|exists:vehiculos,id',
            'estado' => 'required|in:PENDIENTE,COMPLETADO,CANCELADO'
        ]);

        return DB::transaction(function () use ($request) {

            $mantenimiento = Mantenimiento::create([
                'tipo' => $request->tipo,
                'descripcion' => $request->descripcion,
                'fecha_programada' => $request->fecha_programada,
                'costo_estimado' => $request->costo_estimado,
                'taller' => $request->taller,
                'vehiculo_id' => $request->vehiculo_id,
                'estado' => $request->estado,
            ]);

            // 🔥 Actualizar estado del vehículo
            $vehiculo = Vehiculo::findOrFail($request->vehiculo_id);
            $vehiculo->estado = 'MANTENIMIENTO';
            $vehiculo->save();

            return response()->json($mantenimiento, 201);
        });
    }

    public function updateEstado(Request $request, $id){
        $request->validate([
            'estado' => 'required|in:PENDIENTE,EN_PROCESO,COMPLETADO'
        ]);
        $mantenimiento = Mantenimiento::findOrFail($id);
        $mantenimiento->estado = $request->estado;
        $mantenimiento->save();

        if ($request->estado === 'COMPLETADO') {

            $vehiculo = $mantenimiento->vehiculo;

            $otrosPendientes = $vehiculo->mantenimientos()
                ->where('estado', '!=', 'COMPLETADO')
                ->where('id', '!=', $mantenimiento->id)
                ->exists();

            if (!$otrosPendientes) {
                $vehiculo->update([
                    'estado' => 'DISPONIBLE'
                ]);
            }
        }

        return response()->json(['message' => 'Estado Actualizado']);
    }

    public function destroy($id)
    {
        $mantenimiento = Mantenimiento::findOrFail($id);
        $mantenimiento->delete();

        return response()->json(['message' => 'Mantenimiento eliminado']);
    }
}
