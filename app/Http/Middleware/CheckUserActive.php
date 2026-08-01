<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserActive
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && (!$user->activo || $user->deleted)) {
            // Revocar token actual si existe
            $user->currentAccessToken()?->delete();

            return response()->json([
                'error' => 'Usuario desactivado. Su sesión ha sido finalizada.'
            ], 401);
        }

        return $next($request);
    }
}
