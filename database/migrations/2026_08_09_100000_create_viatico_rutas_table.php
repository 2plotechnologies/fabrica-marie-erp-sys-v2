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
        if (!Schema::hasTable('viatico_rutas')) {
            Schema::create('viatico_rutas', function (Blueprint $table) {
                $table->id();
                $table->foreignId('viatico_id')->constrained('caja_chica')->onDelete('cascade');
                $table->foreignId('ruta_id')->constrained('rutas')->onDelete('cascade');
                $table->unique(['viatico_id', 'ruta_id']);
            });
        }

        // Migrar datos existentes desde caja_chica.ruta_id
        DB::statement("
            INSERT IGNORE INTO viatico_rutas (viatico_id, ruta_id)
            SELECT id AS viatico_id, ruta_id
            FROM caja_chica
            WHERE ruta_id IS NOT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('viatico_rutas');
    }
};
