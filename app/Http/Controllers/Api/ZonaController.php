<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Zona;
use App\Models\ZonaPunto;
use Illuminate\Support\Facades\DB;

class ZonaController
{
    public function index()
    {
        $zonas = Zona::with('puntos')->get();

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
            'nombre' => 'required|string',
            'color' => 'required|string',
            'puntos' => 'required|array|min:3'
        ]);

        DB::beginTransaction();

        try {
            $zona = Zona::create([
                'nombre' => $request->nombre,
                'color' => $request->color,
            ]);

            foreach ($request->puntos as $index => $punto) {
                ZonaPunto::create([
                    'zona_id' => $zona->id,
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
