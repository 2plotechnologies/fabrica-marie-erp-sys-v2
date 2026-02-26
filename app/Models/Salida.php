<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Salida extends Model
{
    protected $table = 'salidas';

    protected $fillable = [
        'fecha',
        'vendedor_id',
        'conductor',
        'vehiculo_id',
        'zona',
        'ruta_id',
        'estado'
    ];

    public $timestamps = false;

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class, 'vendedor_id');
    }

    public function vehiculo()
    {
        return $this->belongsTo(Vehiculo::class, 'vehiculo_id');
    }

    public function ruta()
    {
        return $this->belongsTo(Ruta::class, 'ruta_id');
    }

    public function items()
    {
        return $this->hasMany(SalidaItem::class);
    }
}
