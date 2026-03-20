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
            Usuario::with(['roles:id,nombre', 'informacionSalarial'])
                ->where('deleted', false)
                ->get()
        );
    }

    public function show($id)
    {
        return response()->json(
            Usuario::with(['roles:id,nombre', 'informacionSalarial'])
                ->where('id', $id)
                ->where('deleted', false)
                ->first()
        );
    }

    public function getVendedores(){
        return response()->json(
            Vendedor::with(['usuario', 'vehiculos'])
                ->where('activo', true)
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

    public function update(Request $request, $id)
    {
        $usuario = Usuario::findOrFail($id);
        
        $rules = [
            'username' => 'required|string|max:50|unique:usuarios,username,' . $id,
            'email' => 'required|email|unique:usuarios,email,' . $id,
            'nombre' => 'required|string|max:150',
            // Información Salarial
            'sueldo_base' => 'required|numeric|min:0',
            'horas_extra' => 'required|numeric|min:0',
            'afp' => 'required|numeric|min:0',
        ];

        if ($request->filled('password')) {
            $rules['password'] = 'required|string|min:6';
        }

        $validated = $request->validate($rules);

        $updateData = [
            'username' => $validated['username'],
            'email' => $validated['email'],
            'nombre' => $validated['nombre'],
        ];

        if ($request->filled('password')) {
            $updateData['password_hash'] = Hash::make($request->password);
        }

        $usuario->update($updateData);

        $usuario->informacionSalarial()->update([
            'sueldo_base' => $validated['sueldo_base'],
            'horas_extra' => $validated['horas_extra'],
            'afp' => $validated['afp'],
        ]);

        return response()->json([
            'message' => 'Usuario actualizado correctamente'
        ], 200);
    }

    public function destroy($id)
    {
        $usuario = Usuario::findOrFail($id);
        $usuario->deleted = true;
        $usuario->save();

        return response()->json([
            'message' => 'Usuario eliminado correctamente'
        ], 200);
    }
}
