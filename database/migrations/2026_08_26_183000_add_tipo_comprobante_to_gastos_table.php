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
        if (!Schema::hasColumn('gastos', 'tipo_comprobante')) {
            Schema::table('gastos', function (Blueprint $table) {
                $table->string('tipo_comprobante')->default('Otro/Ninguno')->after('comprobante');
            });
        }

        DB::table('gastos')
            ->whereNull('tipo_comprobante')
            ->orWhere('tipo_comprobante', '')
            ->update(['tipo_comprobante' => 'Otro/Ninguno']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('gastos', 'tipo_comprobante')) {
            Schema::table('gastos', function (Blueprint $table) {
                $table->dropColumn('tipo_comprobante');
            });
        }
    }
};
