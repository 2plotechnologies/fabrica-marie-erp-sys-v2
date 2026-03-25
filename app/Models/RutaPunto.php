<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RutaPunto extends Model
{
    protected $table = 'ruta_puntos';

    public $timestamps = false;

    protected $fillable = [
        'ruta_mapa_id',
        'orden',
        'latitud',
        'longitud'
    ];

    // Relación: pertenece a ruta mapa
    public function rutaMapa()
    {
        return $this->belongsTo(RutaMapa::class, 'ruta_mapa_id');
    }
}
