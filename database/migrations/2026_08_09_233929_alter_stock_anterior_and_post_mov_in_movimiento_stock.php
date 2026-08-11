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
        DB::statement('ALTER TABLE movimiento_stock MODIFY stock_anterior DECIMAL(10,2) DEFAULT NULL;');
        DB::statement('ALTER TABLE movimiento_stock MODIFY stock_post_mov DECIMAL(10,2) DEFAULT NULL;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE movimiento_stock MODIFY stock_anterior INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE movimiento_stock MODIFY stock_post_mov INT NOT NULL DEFAULT 0;');
    }
};
