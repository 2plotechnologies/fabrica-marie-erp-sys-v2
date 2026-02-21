<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Controller;
use App\Models\Usuario;
use App\Models\Rol;
use App\Models\Vendedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UsuarioController extends Controller
{
    public function index()
    {
        return response()->json(
            Usuario::with(['roles:id,nombre'])
                ->where('deleted', false)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'username' => 'required|unique:usuarios,username',
            'email' => 'required|email|unique:usuarios,email',
            'nombre' => 'required|string',
            'password' => 'required|min:6',
            'roles' => 'required|array',
            //Información  Salarial
            'sueldo_base' => 'required|numeric|min:0',
            'horas_extra' => 'required|numeric|min:0',
            'afp' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data, $request) {

            $usuario = Usuario::create([
                'username' => $data['username'],
                'email' => $data['email'],
                'nombre' => $data['nombre'],
                'password_hash' => Hash::make($data['password']),
                'activo' => 1,
                'created_at' => now(),
                'created_by' => $request->user()->id,
            ]);

            $usuario->roles()->sync($data['roles']);

            $usuario->informacionSalarial()->create([
                'sueldo_base' => $data['sueldo_base'],
                'horas_extra' => $data['horas_extra'],
                'afp' => $data['afp'],
            ]);

            $rolVendedor = Rol::where('nombre', 'VENDEDOR')->first();

            if ($rolVendedor && in_array($rolVendedor->id, $data['roles'])) {

                Vendedor::create([
                    'usuario_id' => $usuario->id,
                    'activo' => 1,
                ]);
            }
        });

        return response()->json([
            'message' => 'Usuario creado correctamente'
        ], 201);
    }
}
