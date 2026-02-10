<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CuentaPorCobrar extends Model
{
    protected $table = 'cuentas_por_cobrar';
    public $timestamps = false;

    protected $fillable = [
        'venta_id',
        'cliente_id',
        'monto_total',
        'saldo',
        'estado'
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function abonos()
    {
        return $this->hasMany(Abono::class, 'cuenta_id');
    }
}
