<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockVendedor extends Model
{
    protected $table = 'stock_vendedores';

    protected $fillable = [
        'producto_id',
        'vendedor_id',
        'salida_id',
        'cantidad',
        'stock_reservado',
        'vendido',
        'devuelto',
        'fecha_ultimo_mov'
    ];

    public $timestamps = false;

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class, 'vendedor_id');
    }

    public function salida()
    {
        return $this->belongsTo(Salida::class, 'salida_id');
    }
}
