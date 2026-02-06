<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Usuario;
use App\Models\Rol;
use Illuminate\Support\Facades\Hash;

class UsuarioAdminSeeder extends Seeder
{
    public function run()
    {
        $admin = Usuario::firstOrCreate(
            ['email' => 'admin@fabrica.com'],
            [
                'username' => 'admin',
                'nombre' => 'Administrador General',
                'password_hash' => Hash::make('admin123'),
                'activo' => 1,
                'created_at' => now()
            ]
        );

        $rolAdmin = Rol::where('nombre', 'ADMIN')->first();
        $admin->roles()->sync([$rolAdmin->id]);
    }
}
