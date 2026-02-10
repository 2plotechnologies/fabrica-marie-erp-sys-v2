<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendedor extends Model
{
    protected $table = 'vendedores';
    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'activo'
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class);
    }
}
