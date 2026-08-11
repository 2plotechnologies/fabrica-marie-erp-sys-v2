<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VentaItem extends Model
{
    protected $table = 'venta_items';
    public $timestamps = false;

    protected $fillable = [
        'venta_id',
        'producto_id',
        'salida_id',
        'cantidad',
        'precio_unitario',
        'subtotal',
        'es_bonificacion',
        'es_degustacion'
    ];

    protected $casts = [
        'cantidad' => 'float',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function salida()
    {
        return $this->belongsTo(Salida::class, 'salida_id');
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }
}
