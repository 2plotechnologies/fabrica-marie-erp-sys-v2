<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vehiculo extends Model
{
    protected $table = 'vehiculos';

    protected $fillable = [
        'placa',
        'marca',
        'modelo',
        'activo',
    ];

    public $timestamps = false;

    public function gpsPoints()
    {
        return $this->hasMany(GpsPoint::class, 'vehiculo_id');
    }
}
