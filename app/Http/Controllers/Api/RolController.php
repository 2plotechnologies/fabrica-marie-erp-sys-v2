<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RolController extends Controller
{
    // 📌 Listar roles con permisos
    public function index()
    {
        return response()->json(
            Rol::with('permisos')->get()
        );
    }

    // 📌 Crear rol
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|unique:roles,nombre',
            'descripcion' => 'nullable|string',
        ]);

        $rol = Rol::create([
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'activo' => 1
        ]);

        return response()->json([
            'message' => 'Rol creado correctamente',
            'rol' => $rol
        ], 201);
    }

    // 📌 Ver rol con permisos
    public function show($id)
    {
        $rol = Rol::with('permisos')->findOrFail($id);

        return response()->json($rol);
    }

    // 📌 Asignar / actualizar permisos del rol
    public function updatePermisos(Request $request, $id)
    {
        $data = $request->validate([
            'permisos' => 'required|array',
            'permisos.*' => 'exists:permisos,id'
        ]);

        $rol = Rol::findOrFail($id);

        DB::transaction(function () use ($rol, $data) {
            $rol->permisos()->sync($data['permisos']);
        });

        return response()->json([
            'message' => 'Permisos actualizados correctamente'
        ]);
    }

    // 📌 Activar / desactivar rol
    public function toggleEstado($id)
    {
        $rol = Rol::findOrFail($id);
        $rol->activo = !$rol->activo;
        $rol->save();

        return response()->json([
            'message' => 'Estado del rol actualizado',
            'activo' => $rol->activo
        ]);
    }
}
