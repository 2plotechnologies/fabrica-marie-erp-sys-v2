<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Abono extends Model
{
    protected $table = 'abonos';
    public $timestamps = false;

    protected $fillable = [
        'cuenta_id',
        'vendedor_id',
        'monto',
        'metodo_pago',
        'fecha',
        'movimiento_caja_id',
        'estado',
        'anulado_at',
        'anulado_por'
    ];

    public function cuenta()
    {
        return $this->belongsTo(CuentaPorCobrar::class, 'cuenta_id');
    }

    public function movimientoCaja()
    {
        return $this->belongsTo(\App\Models\MovimientoCaja::class, 'movimiento_caja_id');
    }
}
