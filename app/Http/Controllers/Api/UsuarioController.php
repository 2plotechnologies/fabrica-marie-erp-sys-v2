<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UsuarioController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'username' => 'required|unique:usuarios,username',
            'email' => 'required|email|unique:usuarios,email',
            'nombre' => 'required|string',
            'password' => 'required|min:6',
            'roles' => 'required|array'
        ]);

        DB::transaction(function () use ($data, $request) {

            $usuario = Usuario::create([
                'username' => $data['username'],
                'email' => $data['email'],
                'nombre' => $data['nombre'],
                'password_hash' => Hash::make($data['password']),
                'activo' => 1,
                'created_at' => now(),
                'created_by' => $request->user()->id
            ]);

            $usuario->roles()->sync($data['roles']);
        });

        return response()->json([
            'message' => 'Usuario creado correctamente'
        ], 201);
    }
}
