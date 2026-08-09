<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Viatico extends Model
{
    protected $table = 'caja_chica';
    public $timestamps = false;

    protected $fillable = [
        'vendedor_id',
        'tipo',
        'fecha',
        'monto',
        'usado',
        'vuelto',
        'comprobante',
        'zona',
        'ruta_id',
        'salida_id',
        'descripcion',
        'estado',
        'liquidado_by'
    ];

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class);
    }

    public function ruta()
    {
        return $this->belongsTo(Ruta::class);
    }

    public function rutas()
    {
        return $this->belongsToMany(Ruta::class, 'viatico_rutas', 'viatico_id', 'ruta_id');
    }

    public function salida()
    {
        return $this->belongsTo(Salida::class, 'salida_id');
    }

    public function usuario_liquido(){
        return $this->belongsTo(Usuario::class, 'liquidado_by');
    }
}
