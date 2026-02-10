<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MovimientoCaja extends Model
{
    protected $table = 'movimiento_caja';
    public $timestamps = false;

    protected $fillable = [
        'caja_id',
        'tipo',
        'monto',
        'referencia_tipo',
        'referencia_id',
        'created_at'
    ];
}
