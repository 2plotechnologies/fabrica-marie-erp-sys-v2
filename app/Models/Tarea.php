<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tarea extends Model
{
    protected $table = 'tareas';
    public $timestamps = false;

    protected $fillable = [
        'cliente_id',
        'titulo',
        'descripcion',
        'prioridad',
        'fecha_limite',
        'estado',
        'usuario_id',
        'fecha',
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
