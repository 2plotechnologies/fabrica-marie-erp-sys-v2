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
        'movimiento_caja_id'
    ];

    public function cuenta()
    {
        return $this->belongsTo(CuentaPorCobrar::class, 'cuenta_id');
    }
}
