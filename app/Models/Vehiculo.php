<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vehiculo extends Model
{
    protected $table = 'vehiculos';

    protected $fillable = [
        'placa',
        'tipo',
        'marca',
        'modelo',
        'chofer',
        'anio',
        'estado',
        'activo',
    ];

    public $timestamps = false;

    public function gpsPoints()
    {
        return $this->hasMany(GpsPoint::class, 'vehiculo_id');
    }

    public function mantenimientos()
    {
        return $this->hasMany(Mantenimiento::class, 'vehiculo_id');
    }

    public function vendedores()
    {
        return $this->belongsToMany(Vendedor::class, 'vehiculo_vendedor');
    }
}
