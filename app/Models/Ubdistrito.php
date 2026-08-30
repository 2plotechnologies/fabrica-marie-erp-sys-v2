<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ubdistrito extends Model
{
    protected $table = 'ubdistrito';
    protected $primaryKey = 'idDist';
    public $timestamps = false;

    protected $fillable = [
        'idDist',
        'distrito',
        'idProv'
    ];

    public function provincia()
    {
        return $this->belongsTo(Ubprovincia::class, 'idProv', 'idProv');
    }
}
