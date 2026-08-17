<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Devolucion extends Model
{
    protected $table = 'devoluciones';
    public $timestamps = false;

    protected $fillable = [
        'fecha',
        'vendedor_id',
        'tipo',
        'origen_stock',
        'motivo',
        'observaciones',
        'estado',
        'created_at'
    ];

    public function items()
    {
        return $this->hasMany(DevolucionItem::class);
    }

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class);
    }
}
