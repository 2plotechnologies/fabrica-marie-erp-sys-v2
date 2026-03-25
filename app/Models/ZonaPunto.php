<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ZonaPunto extends Model
{
    protected $table = 'zona_puntos';

    public $timestamps = false;

    protected $fillable = [
        'zona_id',
        'latitud',
        'longitud',
        'orden'
    ];

    // Relación: pertenece a zona
    public function zona()
    {
        return $this->belongsTo(Zona::class, 'zona_id');
    }
}
