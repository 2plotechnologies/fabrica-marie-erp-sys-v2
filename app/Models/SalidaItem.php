<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalidaItem extends Model
{
    protected $table = 'salida_items';
    public $timestamps = false;

    protected $fillable = [
        'producto_id',
        'ruma_id',
        'salida_id',
        'cantidad'
    ];

    protected $casts = [
        'cantidad' => 'float',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function ruma()
    {
        return $this->belongsTo(Ruma::class);
    }

    public function salida()
    {
        return $this->belongsTo(Salida::class);
    }
}
