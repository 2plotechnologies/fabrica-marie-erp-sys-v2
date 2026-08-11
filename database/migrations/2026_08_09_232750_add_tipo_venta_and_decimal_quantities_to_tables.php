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
        // Añadir tipo_venta a productos
        Schema::table('productos', function (Blueprint $table) {
            $table->enum('tipo_venta', ['UNIDAD', 'GRANEL'])->default('UNIDAD')->after('nombre');
        });

        // Para evitar problemas de compatibilidad con doctrine/dbal al modificar columnas
        // en versiones antiguas de Laravel, o posibles fallos, ejecutamos sentencias SQL crudas.
        // Si el proyecto usa Laravel 10+, cambiar tipos nativamente es soportado, pero esto es más seguro.

        DB::statement('ALTER TABLE productos MODIFY stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE devolucion_items MODIFY cantidad DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE movimiento_stock MODIFY cantidad DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE rumas MODIFY capacidad_unidades DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE salida_items MODIFY cantidad DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        
        DB::statement('ALTER TABLE stock_actual MODIFY cantidad DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE stock_actual MODIFY stock_reservado DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        
        DB::statement('ALTER TABLE stock_vendedores MODIFY cantidad DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE stock_vendedores MODIFY cantidad_entregada DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE stock_vendedores MODIFY stock_reservado DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE stock_vendedores MODIFY vendido DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        DB::statement('ALTER TABLE stock_vendedores MODIFY devuelto DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
        
        DB::statement('ALTER TABLE venta_items MODIFY cantidad DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('tipo_venta');
        });

        DB::statement('ALTER TABLE productos MODIFY stock_minimo INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE devolucion_items MODIFY cantidad INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE movimiento_stock MODIFY cantidad INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE rumas MODIFY capacidad_unidades INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE salida_items MODIFY cantidad INT NOT NULL DEFAULT 0;');
        
        DB::statement('ALTER TABLE stock_actual MODIFY cantidad INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE stock_actual MODIFY stock_reservado INT NOT NULL DEFAULT 0;');
        
        DB::statement('ALTER TABLE stock_vendedores MODIFY cantidad INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE stock_vendedores MODIFY cantidad_entregada INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE stock_vendedores MODIFY stock_reservado INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE stock_vendedores MODIFY vendido INT NOT NULL DEFAULT 0;');
        DB::statement('ALTER TABLE stock_vendedores MODIFY devuelto INT NOT NULL DEFAULT 0;');
        
        DB::statement('ALTER TABLE venta_items MODIFY cantidad INT NOT NULL DEFAULT 0;');
    }
};
