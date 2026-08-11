<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('resumen_diario_rutas')) {
            Schema::create('resumen_diario_rutas', function (Blueprint $table) {
                $table->id();
                $table->foreignId('resumen_diario_id')->constrained('resumen_diario')->onDelete('cascade');
                $table->foreignId('ruta_id')->constrained('rutas')->onDelete('cascade');
                $table->unique(['resumen_diario_id', 'ruta_id']);
            });
        }

        // Migrar datos existentes desde resumen_diario.ruta_id
        DB::statement("
            INSERT IGNORE INTO resumen_diario_rutas (resumen_diario_id, ruta_id)
            SELECT id AS resumen_diario_id, ruta_id
            FROM resumen_diario
            WHERE ruta_id IS NOT NULL AND ruta_id != 0
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resumen_diario_rutas');
    }
};
