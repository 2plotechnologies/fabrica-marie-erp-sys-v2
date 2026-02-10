<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ruta extends Model
{
    protected $table = 'rutas';

    protected $fillable = [
        'nombre',
        'zona',
        'frecuencia',
        'activo'
    ];

    public $timestamps = false;

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
}
