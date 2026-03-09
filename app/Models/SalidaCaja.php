<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalidaCaja extends Model
{
    protected $table = 'salidas_caja';
    public $timestamps = false;

    protected $fillable = [
        'caja_id',
        'fecha',
        'destinatario',
        'motivo',
        'entregado',
        'usado',
        'vuelto',
        'estado',
        'observaciones',
        'comprobante',
        'registrado_by',
        'liquidado_by'
    ];

    public function caja()
    {
        return $this->belongsTo(Caja::class);
    }

    public function usuario(){
        return $this->belongsTo(Usuario::class, 'registrado_by');
    }

    public function usuario_liquido(){
        return $this->belongsTo(Usuario::class, 'liquidado_by');
    }
}
