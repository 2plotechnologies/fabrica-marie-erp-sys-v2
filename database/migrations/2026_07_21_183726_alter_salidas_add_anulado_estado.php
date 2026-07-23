<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE salidas MODIFY COLUMN estado ENUM('PENDIENTE', 'EN_RUTA', 'COMPLETADO', 'ANULADO') NOT NULL DEFAULT 'PENDIENTE'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE salidas MODIFY COLUMN estado ENUM('PENDIENTE', 'EN_RUTA', 'COMPLETADO') NOT NULL DEFAULT 'PENDIENTE'");
    }
};
