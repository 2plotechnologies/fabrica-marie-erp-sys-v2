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
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE movimiento_stock MODIFY COLUMN tipo ENUM('INGRESO','SALIDA','AJUSTE','DEVOLUCION_BUENA','DEVOLUCION_MALA','DESECHO','TRANSFERENCIA_VENDEDOR') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE movimiento_stock MODIFY COLUMN tipo ENUM('INGRESO','SALIDA','AJUSTE','DEVOLUCION_BUENA','DEVOLUCION_MALA','DESECHO') NOT NULL");
    }
};
