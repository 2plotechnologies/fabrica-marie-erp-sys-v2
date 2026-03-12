<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Interaccion extends Model
{
    protected $table = 'interacciones_cliente';
    public $timestamps = false;

    protected $fillable = [
        'cliente_id',
        'tipo',
        'descripcion',
        'usuario_id',
        'created_at',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }
    
}
