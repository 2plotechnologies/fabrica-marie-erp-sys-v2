<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Salida extends Model
{
    protected $table = 'salidas';

    protected $fillable = [
        'fecha',
        'vendedor_id',
        'conductor',
        'vehiculo_id',
        'zona',
        'ruta_id',
        'estado'
    ];

    protected $appends = ['tiene_ventas'];

    public function getTieneVentasAttribute()
    {
        return \App\Models\StockVendedor::where('salida_id', $this->id)
            ->whereRaw('cantidad < cantidad_entregada')
            ->exists();
    }

    public $timestamps = false;

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class, 'vendedor_id');
    }

    public function vehiculo()
    {
        return $this->belongsTo(Vehiculo::class, 'vehiculo_id');
    }

    public function ruta()
    {
        return $this->belongsTo(Ruta::class, 'ruta_id');
    }

    public function rutas()
    {
        return $this->belongsToMany(Ruta::class, 'salida_rutas', 'salida_id', 'ruta_id');
    }

    public function items()
    {
        return $this->hasMany(SalidaItem::class);
    }

    public function stockVendedor()
    {
        return $this->hasOne(StockVendedor::class, 'salida_id');
    }

    public function viaticos()
    {
        return $this->hasMany(Viatico::class, 'salida_id');
    }

    public function resumenesDiarios()
    {
        return $this->hasMany(ResumenDiario::class, 'salida_id');
    }
}
