<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ruma extends Model
{
    protected $table = 'rumas';

    protected $fillable = [
        'codigo',
        'descripcion',
        'capacidad_unidades',
        'ubicacion_fisica'
    ];

    public $timestamps = false;

    public function stock()
    {
        return $this->hasMany(StockActual::class, 'ruma_id');
    }
}
