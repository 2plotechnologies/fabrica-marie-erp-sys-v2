<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Caja extends Model
{
    protected $table = 'cajas';
    public $timestamps = false;

     protected $fillable = [
        'usuario_id',
        'fecha',
        'saldo_inicial',
        'saldo_actual',
        'total_ingresos',
        'total_egresos',
        'estado',
        'cerrado_at'
    ];

    public function movimientos()
    {
        return $this->hasMany(MovimientoCaja::class);
    }
}
