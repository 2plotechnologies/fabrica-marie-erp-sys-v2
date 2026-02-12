<?php

namespace App\Http\Controllers\Api;

use App\Models\GpsPoint;
use Illuminate\Http\Request;

class GpsPointController extends Controller
{
    public function index()
    {
        return response()->json(
            GpsPoint::with('vehiculo')
                ->orderByDesc('captured_at')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $gpsPoint = GpsPoint::create($request->all());

        return response()->json($gpsPoint, 201);
    }

    public function show($id)
    {
        return response()->json(
            GpsPoint::with('vehiculo')->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $gpsPoint = GpsPoint::findOrFail($id);
        $gpsPoint->update($request->all());

        return response()->json($gpsPoint);
    }

    public function destroy($id)
    {
        $gpsPoint = GpsPoint::findOrFail($id);
        $gpsPoint->delete();

        return response()->json(['message' => 'Punto GPS eliminado']);
    }
}
