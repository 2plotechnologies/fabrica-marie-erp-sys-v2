<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ruta extends Model
{
    protected $table = 'rutas';

    protected $fillable = [
        'nombre',
        'zona',
        'descripcion',
        'frecuencia',
        'vendedor_id',
        'clientes_estimados',
        'activo'
    ];

    public $timestamps = false;

    public function vendedor()
    {
        return $this->hasOne(Vendedor::class);
    }

    public function clientes()
    {
        return $this->belongsToMany(
            Cliente::class,
            'ruta_cliente',
            'ruta_id',
            'cliente_id'
        )->withPivot('orden')
         ->orderBy('ruta_cliente.orden');
    }

    public function mapa()
    {
        return $this->hasOne(RutaMapa::class, 'ruta_id');
    }
}
