<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Venta extends Model
{
    protected $table = 'ventas';
    public $timestamps = false;

    protected $fillable = [
        'codigo',
        'vendedor_id',
        'cliente_id',
        'fecha',
        'total_neto',
        'tipo_pago',
        'estado'
    ];

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function items()
    {
        return $this->hasMany(VentaItem::class);
    }

    public function cuenta()
    {
        return $this->hasOne(CuentaPorCobrar::class);
    }
}
