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

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }
}
