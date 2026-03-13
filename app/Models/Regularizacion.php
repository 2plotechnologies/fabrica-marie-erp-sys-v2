<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Regularizacion extends Model
{
    protected $table = 'regularizaciones';
    public $timestamps = false;

    protected $fillable = [
        'cierre_caja_id',
        'fecha_regularizacion',
        'monto_cierre_original',
        'diferencia',
        'monto_real',
        'motivo',
        'estado',
        'aprobado_by',
        'aprobado_at',
    ];

    public function cierreCaja()
    {
        return $this->belongsTo(CierreCaja::class);
    }

    public function usuarioAprobador()
    {
        return $this->belongsTo(Usuario::class, 'aprobado_by');
    }
}
