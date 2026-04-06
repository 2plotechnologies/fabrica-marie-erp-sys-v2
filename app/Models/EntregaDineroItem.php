<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EntregaDineroItem extends Model
{
    protected $table = 'entregas_dinero_item';
    public $timestamps = false;

    protected $fillable = [
        'entrega_id',
        'metodo_pago',
        'monto',
        'comprobante_path',
    ];

    public function entrega()
    {
        return $this->belongsTo(EntregaDinero::class, 'entrega_id', 'id');
    }
}
