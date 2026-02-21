<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InformacionSalarialEmp extends Model
{
    protected $table = 'informacion_salarial_emp';
    public $timestamps = false;

    protected $fillable = [
        'sueldo_base',
        'horas_extra',
        'afp',
        'id_usuario',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, "id_usuario");
    }
}
