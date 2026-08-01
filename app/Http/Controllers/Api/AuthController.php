<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Controller;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required',
            'password' => 'required'
        ]);

        // Buscar usuario por email o username
        $user = Usuario::where('email', $credentials['email'])
            ->orWhere('username', $credentials['email'])
            ->first();

        if (!$user) {
            return response()->json(['message' => 'Credenciales incorrectas'], 401);
        }

        // Verificar contraseña
        $passwordMatches = Hash::check($credentials['password'], $user->password_hash);
        if (!$passwordMatches) {
            return response()->json(['message' => 'Credenciales incorrectas'], 401);
        }

        // Verificar si el usuario se encuentra desactivado o eliminado
        if (!$user->activo || $user->deleted) {
            return response()->json([
                'message' => 'El usuario se encuentra desactivado. No tiene acceso al sistema.'
            ], 403);
        }

        Auth::login($user);

        $user->ultimo_login = now();
        $user->save();

        $token = $user->createToken('erp-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
            'roles' => $user->roles,
            'permisos' => $user->permisos()->get()
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada']);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'roles' => $request->user()->roles,
            'permisos' => $request->user()->permisos()->get()
        ]);
    }
}
