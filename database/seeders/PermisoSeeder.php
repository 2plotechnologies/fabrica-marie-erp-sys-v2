<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permiso;

class PermisoSeeder extends Seeder
{
    public function run()
    {
        $permisos = [
            // Producción
            ['codigo' => 'ver_produccion', 'descripcion' => 'Ver producción'],
            ['codigo' => 'crear_produccion', 'descripcion' => 'Crear producción'],
            ['codigo' => 'editar_produccion', 'descripcion' => 'Editar producción'],

            // Ventas
            ['codigo' => 'ver_ventas', 'descripcion' => 'Ver ventas'],
            ['codigo' => 'crear_venta', 'descripcion' => 'Crear venta'],
            ['codigo' => 'anular_abono', 'descripcion' => 'Anular abono de cuenta por cobrar'],

            // Inventario
            ['codigo' => 'ver_inventario', 'descripcion' => 'Ver inventario'],
            ['codigo' => 'editar_inventario', 'descripcion' => 'Editar inventario'],

            // Seguridad
            ['codigo' => 'ver_roles', 'descripcion' => 'Ver roles'],
            ['codigo' => 'crear_rol', 'descripcion' => 'Crear roles'],
            ['codigo' => 'editar_rol', 'descripcion' => 'Editar roles'],
            ['codigo' => 'asignar_permisos', 'descripcion' => 'Asignar permisos a roles'],
            ['codigo' => 'crear_usuario', 'descripcion' => 'Crear usuarios'],
        ];

        foreach ($permisos as $permiso) {
            Permiso::firstOrCreate(
                ['codigo' => $permiso['codigo']],
                ['descripcion' => $permiso['descripcion']]
            );
        }
    }
}
