<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimiento_caja', function (Blueprint $table) {
            $table->enum('estado', ['PENDIENTE', 'APROBADO', 'RECHAZADO'])
                ->default('APROBADO')
                ->after('tipo');
        });
    }

    public function down(): void
    {
        Schema::table('movimiento_caja', function (Blueprint $table) {
            $table->dropColumn('estado');
        });
    }
};
