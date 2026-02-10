<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockActual extends Model
{
    protected $table = 'stock_actual';

    protected $fillable = [
        'producto_id',
        'ruma_id',
        'cantidad',
        'fecha_ultimo_mov'
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
