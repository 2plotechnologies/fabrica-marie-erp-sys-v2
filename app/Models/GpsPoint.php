<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GpsPoint extends Model
{
    protected $table = 'gps_points';

    protected $fillable = [
        'vehiculo_id',
        'lat',
        'lon',
        'velocidad',
        'captured_at',
        'raw_json',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
        'raw_json' => 'array',
    ];

    public $timestamps = false;

    public function vehiculo()
    {
        return $this->belongsTo(Vehiculo::class, 'vehiculo_id');
    }
}
