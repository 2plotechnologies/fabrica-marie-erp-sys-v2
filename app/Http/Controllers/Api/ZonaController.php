<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Zona;
use App\Models\ZonaPunto;
use App\Models\Cliente;
use Illuminate\Support\Facades\DB;

class ZonaController
{
    private function crearOActualizarClienteVarios(Zona $zona)
    {
        $codigoCliente = 'VAR-ZONA-' . $zona->id;
        $razonSocial = 'Clientes Varios Zona ' . $zona->nombre;

        Cliente::updateOrCreate(
            ['codigo_cliente' => $codigoCliente],
            [
                'razon_social' => $razonSocial,
                'tipo_cliente' => 'CONSUMIDOR',
                'condicion_pago' => 'CONTADO',
                'limite_credito' => 0,
                'dias_credito' => 0,
                'deuda_actual' => 0,
                'activo' => true,
                'status' => 'ACTIVO',
            ]
        );
    }

    public function index()
    {
        $zonas = Zona::with('puntos')->get();

        // Asegurar que cada zona existente tenga su cliente varios registrado
        foreach ($zonas as $z) {
            $this->crearOActualizarClienteVarios($z);
        }

        return response()->json(
            $zonas->map(function ($z) {
                return [
                    'id' => $z->id,
                    'nombre' => $z->nombre,
                    'color' => $z->color,
                    'puntos' => $z->puntos->map(function ($p) {
                        return [
                            'latitud' => $p->latitud,
                            'longitud' => $p->longitud,
                            'orden' => $p->orden,
                        ];
                    })
                ];
            })
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'zona_id' => 'nullable|exists:zonas,id',
            'nombre' => 'required|string',
            'color' => 'required|string',
            'puntos' => 'nullable|array'
        ]);

        DB::beginTransaction();

        try {
            if ($request->filled('zona_id')) {
                $zona = Zona::findOrFail($request->zona_id);
                $zona->update([
                    'nombre' => $request->nombre,
                    'color' => $request->color,
                ]);
            } else {
                $zona = Zona::create([
                    'nombre' => $request->nombre,
                    'color' => $request->color,
                ]);
            }

            // Crear o actualizar registro de cliente varios para esta zona
            $this->crearOActualizarClienteVarios($zona);

            if ($request->has('puntos') && is_array($request->puntos)) {
                // Borrar puntos anteriores si existen y recrear los nuevos
                ZonaPunto::where('zona_id', $zona->id)->delete();

                foreach ($request->puntos as $index => $punto) {
                    ZonaPunto::create([
                        'zona_id' => $zona->id,
                        'orden' => isset($punto['orden']) ? $punto['orden'] : $index,
                        'latitud' => $punto['latitud'],
                        'longitud' => $punto['longitud'],
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $zona->load('puntos')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre' => 'sometimes|required|string',
            'color' => 'sometimes|required|string',
            'puntos' => 'nullable|array'
        ]);

        DB::beginTransaction();

        try {
            $zona = Zona::findOrFail($id);

            $updateData = [];
            if ($request->has('nombre')) $updateData['nombre'] = $request->nombre;
            if ($request->has('color')) $updateData['color'] = $request->color;
            
            if (!empty($updateData)) {
                $zona->update($updateData);
            }

            // Crear o actualizar registro de cliente varios para esta zona
            $this->crearOActualizarClienteVarios($zona);

            if ($request->has('puntos') && is_array($request->puntos)) {
                ZonaPunto::where('zona_id', $zona->id)->delete();

                foreach ($request->puntos as $index => $punto) {
                    ZonaPunto::create([
                        'zona_id' => $zona->id,
                        'orden' => isset($punto['orden']) ? $punto['orden'] : $index,
                        'latitud' => $punto['latitud'],
                        'longitud' => $punto['longitud'],
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $zona->load('puntos')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $zona = Zona::findOrFail($id);
            ZonaPunto::where('zona_id', $zona->id)->delete();

            // Eliminar el cliente varios asociado a esta zona si existe
            Cliente::where('codigo_cliente', 'VAR-ZONA-' . $zona->id)->delete();

            $zona->delete();

            DB::commit();

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
