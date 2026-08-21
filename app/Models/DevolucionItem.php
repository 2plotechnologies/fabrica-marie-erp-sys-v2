<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DevolucionItem extends Model
{
     protected $table = 'devolucion_items';
     public $timestamps = false;

    protected $fillable = [
        'devolucion_id',
        'producto_id',
        'cantidad',
        'motivo'
    ];

    protected $casts = [
        'cantidad' => 'float',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function devolucion()
    {
        return $this->belongsTo(Devolucion::class);
    }
}
