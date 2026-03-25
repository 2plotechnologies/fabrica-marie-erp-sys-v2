<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Zona extends Model
{
    protected $table = 'zonas';

    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'color'
    ];

    // Relación: tiene muchos puntos (polígono)
    public function puntos()
    {
        return $this->hasMany(ZonaPunto::class, 'zona_id')
                    ->orderBy('orden');
    }
}
