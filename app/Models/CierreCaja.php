<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CierreCaja extends Model
{
    protected $table = 'cierres_caja';
    public $timestamps = false;

    protected $fillable = [
        'caja_id',
        'conteo_real',
        'saldo_teorico',
        'diferencia',
        'estado',
    ];

    public function caja()
    {
        return $this->belongsTo(Caja::class, 'caja_id');
    }
}
