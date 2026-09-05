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
        'estado',
        'monto',
        'metodo_pago',
        'comprobante',
        'categoria',
        'descripcion',
        'referencia_tipo',
        'referencia_id',
        'conciliado_by',
        'created_at'
    ];

    public function caja()
    {
        return $this->belongsTo(Caja::class);
    }

    public function conciliador()
    {
        return $this->belongsTo(Usuario::class, 'conciliado_by');
    }

    public function gasto()
    {
        return $this->belongsTo(Gasto::class, 'referencia_id'); // We'll conditionally check referencia_tipo in queries if needed, but this is fine since it's a direct reference.
    }
}
