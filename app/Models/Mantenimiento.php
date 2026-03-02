<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mantenimiento extends Model
{
    protected $table = 'mantenimiento_vehiculo';

    protected $fillable = [
        'tipo',
        'descripcion',
        'fecha_programada',
        'costo_estimado',
        'taller',
        'vehiculo_id',
        'estado'
    ];

    public $timestamps = false;

    public function vehiculo()
    {
        return $this->belongsTo(Vehiculo::class, 'vehiculo_id');
    }
}
