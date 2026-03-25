<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RutaMapa extends Model
{
    protected $table = 'rutas_mapa';

    public $timestamps = false;

    protected $fillable = [
        'ruta_id',
        'nombre',
        'zona'
    ];

    // Relación con tu tabla original de rutas
    public function ruta()
    {
        return $this->belongsTo(Ruta::class, 'ruta_id');
    }

    // Relación: tiene muchos puntos
    public function puntos()
    {
        return $this->hasMany(RutaPunto::class, 'ruta_mapa_id')
                    ->orderBy('orden');
    }
}
