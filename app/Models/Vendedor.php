<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendedor extends Model
{
    protected $table = 'vendedores';
    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'activo',
        'venta_directa',
        'venta_en_ruta'
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class);
    }

    public function stockVendedor()
    {
        return $this->hasMany(StockVendedor::class);
    }

    public function cierreCaja()
    {
        return $this->hasMany(CierreCaja::class);
    }

    public function vehiculos()
    {
        return $this->belongsToMany(Vehiculo::class, 'vehiculo_vendedor');
    }
}
