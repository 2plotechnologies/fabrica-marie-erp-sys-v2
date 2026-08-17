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
        Schema::table('stock_vendedores', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_vendedores', 'defectuosos')) {
                $table->decimal('defectuosos', 10, 2)->default(0)->after('devuelto');
            }
        });

        Schema::table('devoluciones', function (Blueprint $table) {
            if (!Schema::hasColumn('devoluciones', 'origen_stock')) {
                $table->string('origen_stock', 50)->nullable()->default('REGULAR')->after('tipo');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_vendedores', function (Blueprint $table) {
            if (Schema::hasColumn('stock_vendedores', 'defectuosos')) {
                $table->dropColumn('defectuosos');
            }
        });

        Schema::table('devoluciones', function (Blueprint $table) {
            if (Schema::hasColumn('devoluciones', 'origen_stock')) {
                $table->dropColumn('origen_stock');
            }
        });
    }
};
