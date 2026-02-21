<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class Usuario extends Authenticatable
{
    use HasFactory;
    use HasApiTokens, Notifiable;

    protected $table = 'usuarios';

    protected $fillable = [
        'username',
        'email',
        'password_hash',
        'nombre',
        'activo'
    ];

    protected $hidden = [
        'password_hash'
    ];

    // Laravel espera "password"
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    // 🔗 Relaciones
    public function roles()
    {
        return $this->belongsToMany(Rol::class, 'usuario_rol');
    }

    public function informacionSalarial()
    {
        return $this->hasOne(InformacionSalarialEmp::class, 'id_usuario', 'id');
    }

    public function permisos()
    {
        return $this->roles()
            ->join('rol_permiso', 'roles.id', '=', 'rol_permiso.rol_id')
            ->join('permisos', 'rol_permiso.permiso_id', '=', 'permisos.id')
            ->select('permisos.*')
            ->distinct();
    }
}
