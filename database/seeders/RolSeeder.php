<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rol;

class RolSeeder extends Seeder
{
    public function run()
    {
        $roles = [
            ['nombre' => 'ADMIN', 'descripcion' => 'Administrador del sistema'],
            ['nombre' => 'PRODUCCION', 'descripcion' => 'Área de producción'],
            ['nombre' => 'VENTAS', 'descripcion' => 'Área de ventas'],
        ];

        foreach ($roles as $rol) {
            Rol::firstOrCreate(
                ['nombre' => $rol['nombre']],
                ['descripcion' => $rol['descripcion'], 'activo' => 1]
            );
        }
    }
}
