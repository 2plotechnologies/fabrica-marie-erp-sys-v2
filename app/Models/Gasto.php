<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Gasto extends Model
{
    protected $table = 'gastos';
    public $timestamps = false;

    protected $fillable = [
        'vendedor_id',
        'monto',
        'comprobante',
        'tipo_comprobante',
        'tipo',
        'fecha',
        'resumen_diario_id',
        'estado'
    ];

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class);
    }

    public function resumenDiario()
    {
        return $this->belongsTo(ResumenDiario::class);
    }
}
