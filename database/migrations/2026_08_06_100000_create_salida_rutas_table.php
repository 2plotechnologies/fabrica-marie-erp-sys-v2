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
        if (!Schema::hasTable('salida_rutas')) {
            Schema::create('salida_rutas', function (Blueprint $table) {
                $table->id();
                $table->foreignId('salida_id')->constrained('salidas')->onDelete('cascade');
                $table->foreignId('ruta_id')->constrained('rutas')->onDelete('cascade');
                $table->unique(['salida_id', 'ruta_id']);
            });
        }

        // Migrar datos existentes desde salidas.ruta_id si no existen en salida_rutas
        DB::statement("
            INSERT IGNORE INTO salida_rutas (salida_id, ruta_id)
            SELECT id AS salida_id, ruta_id
            FROM salidas
            WHERE ruta_id IS NOT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salida_rutas');
    }
};
