<?php

namespace App\Http\Middleware;

use App\Models\Caja;
use Closure;
use Illuminate\Http\Request;

class CajaAbierta
{
    public function handle(Request $request, Closure $next)
    {
        $caja = Caja::where('usuario_id', auth()->id())
            ->where('fecha', now()->toDateString())
            ->where('estado', 'ABIERTA')
            ->first();

        if (!$caja) {
            return response()->json([
                'message' => 'No existe una caja abierta para el usuario'
            ], 403);
        }

        // Guardamos la caja para usarla luego
        $request->attributes->set('caja', $caja);

        return $next($request);
    }
}
