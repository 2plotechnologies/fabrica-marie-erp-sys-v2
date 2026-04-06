<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EntregaDinero extends Model
{
    protected $table = 'entregas_de_dinero';
    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'created_at',
        'recibido_by',
        'aprobado_at',
        'monto_total',
        'observaciones',
        'estado'
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }

    public function items()
    {
        return $this->hasMany(EntregaDineroItem::class, 'entrega_id', 'id');
    }
}
