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
        Schema::table('abonos', function (Blueprint $table) {
            if (!Schema::hasColumn('abonos', 'banco')) {
                $table->string('banco', 100)->nullable()->after('metodo_pago');
            }
            if (!Schema::hasColumn('abonos', 'numero_operacion')) {
                $table->string('numero_operacion', 100)->nullable()->after('banco');
            }
            if (!Schema::hasColumn('abonos', 'referencia')) {
                $table->string('referencia', 255)->nullable()->after('numero_operacion');
            }
        });

        // Llenar filas pasadas para evitar NULLs sin referencia
        DB::statement("UPDATE abonos SET referencia = CONCAT('Abono ', LOWER(metodo_pago)) WHERE referencia IS NULL OR referencia = ''");
        DB::statement("UPDATE abonos SET banco = '-' WHERE banco IS NULL OR banco = ''");
        DB::statement("UPDATE abonos SET numero_operacion = '-' WHERE numero_operacion IS NULL OR numero_operacion = ''");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('abonos', function (Blueprint $table) {
            if (Schema::hasColumn('abonos', 'banco')) {
                $table->dropColumn('banco');
            }
            if (Schema::hasColumn('abonos', 'numero_operacion')) {
                $table->dropColumn('numero_operacion');
            }
            if (Schema::hasColumn('abonos', 'referencia')) {
                $table->dropColumn('referencia');
            }
        });
    }
};
