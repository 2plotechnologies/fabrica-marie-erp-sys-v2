<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rol;
use App\Models\Permiso;

class RolPermisoSeeder extends Seeder
{
    public function run()
    {
        $admin = Rol::where('nombre', 'ADMIN')->first();
        $produccion = Rol::where('nombre', 'PRODUCCION')->first();
        $ventas = Rol::where('nombre', 'VENTAS')->first();

        // ADMIN → todos los permisos
        $admin->permisos()->sync(
            Permiso::pluck('id')->toArray()
        );

        // PRODUCCIÓN
        $produccion->permisos()->sync(
            Permiso::whereIn('codigo', [
                'ver_produccion',
                'crear_produccion',
                'editar_produccion',
                'ver_inventario'
            ])->pluck('id')->toArray()
        );

        // VENTAS
        $ventas->permisos()->sync(
            Permiso::whereIn('codigo', [
                'ver_ventas',
                'crear_venta',
                'ver_inventario'
            ])->pluck('id')->toArray()
        );
    }
}
