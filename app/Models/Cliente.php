<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    protected $table = 'clientes';

    protected $fillable = [
        'codigo_cliente',
        'razon_social',
        'tipo_cliente',
        'direccion',
        'telefono',
        'ruta_id',
        'condicion_pago',
        'limite_credito',
        'dias_credito',
        'deuda_actual',
        'activo',
        'status'
    ];

    public $timestamps = false;

    public function ruta()
    {
        return $this->belongsTo(Ruta::class, 'ruta_id');
    }

    public function rutas()
    {
        return $this->belongsToMany(
            Ruta::class,
            'ruta_cliente',
            'cliente_id',
            'ruta_id'
        )->withPivot('orden');
    }
}
