<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ubdepartamento extends Model
{
    protected $table = 'ubdepartamento';
    protected $primaryKey = 'idDepa';
    public $timestamps = false;

    protected $fillable = [
        'idDepa',
        'departamento'
    ];

    public function provincias()
    {
        return $this->hasMany(Ubprovincia::class, 'idDepa', 'idDepa');
    }
}
