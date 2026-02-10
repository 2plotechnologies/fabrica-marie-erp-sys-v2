<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    protected $table = 'productos';

    protected $fillable = [
        'sku',
        'nombre',
        'descripcion',
        'presentacion',
        'unidad_medida',
        'precio_base',
        'stock_minimo',
        'activo',
        'created_by'
    ];

    public $timestamps = false;

    /* Relaciones */
    public function stock()
    {
        return $this->hasMany(StockActual::class, 'producto_id');
    }

    public function movimientos()
    {
        return $this->hasMany(MovimientoStock::class, 'producto_id');
    }
}
