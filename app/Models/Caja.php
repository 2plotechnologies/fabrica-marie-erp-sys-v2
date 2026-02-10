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
        'estado'
    ];

    public function movimientos()
    {
        return $this->hasMany(MovimientoCaja::class);
    }
}
