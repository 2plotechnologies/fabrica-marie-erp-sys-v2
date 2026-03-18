<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProyeccionVenta extends Model
{
    protected $table = 'proyecciones_ventas';

    protected $fillable = [
        'mes',
        'monto_proyectado'
    ];
}
