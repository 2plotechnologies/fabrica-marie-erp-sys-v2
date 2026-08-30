<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ubprovincia extends Model
{
    protected $table = 'ubprovincia';
    protected $primaryKey = 'idProv';
    public $timestamps = false;

    protected $fillable = [
        'idProv',
        'provincia',
        'idDepa'
    ];

    public function departamento()
    {
        return $this->belongsTo(Ubdepartamento::class, 'idDepa', 'idDepa');
    }

    public function distritos()
    {
        return $this->hasMany(Ubdistrito::class, 'idProv', 'idProv');
    }
}
