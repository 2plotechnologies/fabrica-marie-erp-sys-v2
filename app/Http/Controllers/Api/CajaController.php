<?php

namespace App\Http\Controllers;

use App\Models\Caja;
use Illuminate\Http\Request;

class CajaController extends Controller
{
    public function abrir(Request $request)
    {
        return Caja::create([
            'usuario_id' => auth()->id(),
            'fecha' => now()->toDateString(),
            'saldo_inicial' => $request->saldo_inicial,
            'saldo_actual' => $request->saldo_inicial,
            'estado' => 'ABIERTA'
        ]);
    }
}
