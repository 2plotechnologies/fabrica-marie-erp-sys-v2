<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    protected $table = 'clientes';

    protected $fillable = [
        'codigo_cliente',
        'razon_social',
        'tipo_cliente',
        'direccion',
        'telefono',
        'ruta_id',
        'condicion_pago',
        'limite_credito',
        'dias_credito',
        'deuda_actual',
        'activo',
        'status'
    ];

    public $timestamps = false;

    public function ruta()
    {
        return $this->belongsTo(Ruta::class, 'ruta_id');
    }

    public function rutas()
    {
        return $this->belongsToMany(
            Ruta::class,
            'ruta_cliente',
            'cliente_id',
            'ruta_id'
        )->withPivot('orden');
    }

    public function interacciones()
    {
        return $this->hasMany(Interaccion::class);
    }

    public function tareas()
    {
        return $this->hasMany(Tarea::class);
    }

    public function ubicacion()
    {
        return $this->hasOne(ClienteUbicacion::class);
    }

    public static function isClienteVarios($cliente): bool
    {
        if (!$cliente) return false;
        $codigo = (string) ($cliente->codigo_cliente ?? '');
        $razon = strtolower((string) ($cliente->razon_social ?? ''));

        return $codigo === '000000' ||
               $codigo === '0000000' ||
               $codigo === '000' ||
               str_starts_with($codigo, 'VAR-ZONA-') ||
               str_contains($razon, 'cliente varios') ||
               str_contains($razon, 'clientes varios');
    }

    public function scopeExcluirClientesVarios($query)
    {
        $table = $this->getTable();
        return $query->where("{$table}.codigo_cliente", '!=', '000000')
                     ->where("{$table}.codigo_cliente", '!=', '0000000')
                     ->where("{$table}.codigo_cliente", 'NOT LIKE', 'VAR-ZONA-%')
                     ->where("{$table}.razon_social", 'NOT LIKE', '%Cliente%Varios%');
    }
}
