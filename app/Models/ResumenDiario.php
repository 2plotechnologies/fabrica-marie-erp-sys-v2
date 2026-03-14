<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResumenDiario extends Model
{
    protected $table = 'resumen_diario';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'fecha',
        'vendedor_id',
        'vehiculo_id',
        'ruta_id',
        'salida_id',
        'conductor',
        'zona',
        'contado',
        'credito',
        'cobranza',
        'adelanto',
        'depositos',
        'viaticos',
        'total_gastos',
        'saldo_a_entregar',
        'saldo_entregado',
        'diferencia',
        'estado',
        'firma',
        'created_at',
    ];

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class);
    }

    public function ruta()
    {
        return $this->belongsTo(Ruta::class);
    }

    public function salida()
    {
        return $this->belongsTo(Salida::class);
    }

    public function vehiculo()
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function gastos()
    {
        return $this->hasMany(Gasto::class);
    }
}
