<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\RutaMapa;
use App\Models\RutaPunto;
use Illuminate\Support\Facades\DB;

class RutaMapaController
{
    public function index()
    {
        $rutas = RutaMapa::with('ruta', 'puntos')->get();

        return response()->json(
            $rutas->map(function ($r) {
                return [
                    'id' => $r->id,
                    'nombre' => $r->nombre,
                    'zona' => $r->zona,
                    'ruta_id' => $r->ruta_id,
                    'ruta' => $r->ruta,
                    'puntos' => $r->puntos->map(function ($p) {
                        return [
                            'id' => $p->id,
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
            'nombre' => 'required|string',
            'zona' => 'required|string',
            'puntos' => 'required|array|min:2',
            'ruta_id' => 'required|exists:rutas,id'
        ]);

        DB::beginTransaction();

        try {
            $rutaMapa = RutaMapa::create([
                'ruta_id' => $request->ruta_id,
                'nombre' => $request->nombre,
                'zona' => $request->zona,
            ]);

            foreach ($request->puntos as $index => $punto) {
                RutaPunto::create([
                    'ruta_mapa_id' => $rutaMapa->id,
                    'orden' => $index,
                    'latitud' => $punto['latitud'],
                    'longitud' => $punto['longitud'],
                ]);
            }

            DB::commit();

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
