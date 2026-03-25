<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClienteUbicacion extends Model
{
    protected $table = 'cliente_ubicaciones';

    public $timestamps = false;

    protected $fillable = [
        'cliente_id',
        'latitud',
        'longitud'
    ];

    // Relación: pertenece a cliente
    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }
}
