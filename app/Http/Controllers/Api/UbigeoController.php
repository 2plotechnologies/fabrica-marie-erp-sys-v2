<?php

namespace App\Http\Controllers\Api;

use App\Models\Ubdepartamento;
use App\Models\Ubprovincia;
use App\Models\Ubdistrito;
use Illuminate\Http\Request;

class UbigeoController extends Controller
{
    public function departamentos()
    {
        return response()->json(
            Ubdepartamento::orderBy('departamento', 'asc')->get()
        );
    }

    public function provincias($idDepa)
    {
        return response()->json(
            Ubprovincia::where('idDepa', $idDepa)->orderBy('provincia', 'asc')->get()
        );
    }

    public function distritos($idProv)
    {
        return response()->json(
            Ubdistrito::where('idProv', $idProv)->orderBy('distrito', 'asc')->get()
        );
    }
}
