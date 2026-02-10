<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MovimientoStock extends Model
{
    protected $table = 'movimiento_stock';

    protected $fillable = [
        'tipo',
        'producto_id',
        'ruma_id',
        'cantidad',
        'referencia_tipo',
        'referencia_id',
        'motivo',
        'stock_post_mov',
        'user_id'
    ];

    public $timestamps = false;

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function ruma()
    {
        return $this->belongsTo(Ruma::class, 'ruma_id');
    }
}
