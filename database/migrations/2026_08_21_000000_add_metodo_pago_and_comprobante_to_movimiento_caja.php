<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimiento_caja', function (Blueprint $table) {
            if (!Schema::hasColumn('movimiento_caja', 'metodo_pago')) {
                $table->string('metodo_pago', 50)->default('EFECTIVO')->after('monto');
            }
            if (!Schema::hasColumn('movimiento_caja', 'comprobante')) {
                $table->string('comprobante', 255)->nullable()->after('metodo_pago');
            }
            if (!Schema::hasColumn('movimiento_caja', 'conciliado_by')) {
                $table->integer('conciliado_by')->nullable()->after('referencia_id');
            }
        });

        // Intentar agregar FK si no existe
        try {
            Schema::table('movimiento_caja', function (Blueprint $table) {
                $table->foreign('conciliado_by')->references('id')->on('usuarios')->onDelete('set null');
            });
        } catch (\Throwable $e) {
            // Si la FK ya existe o no se puede aplicar silenciosamente
        }

        // 1. Rellenar metodo_pago y comprobante desde la tabla venta_pagos (ventas desglosadas)
        try {
            DB::statement("
                UPDATE `movimiento_caja` mc
                INNER JOIN `venta_pagos` vp ON mc.`referencia_tipo` = 'VENTA' AND mc.`referencia_id` = vp.`venta_id`
                LEFT JOIN `ventas` v ON v.`id` = mc.`referencia_id`
                SET 
                  mc.`metodo_pago` = UPPER(vp.`metodo_pago`),
                  mc.`comprobante` = COALESCE(vp.`numero_operacion`, v.`codigo`)
            ");
        } catch (\Throwable $e) {}

        // 2. Rellenar metodo_pago y comprobante desde la tabla ventas (ventas simples)
        try {
            DB::statement("
                UPDATE `movimiento_caja` mc
                INNER JOIN `ventas` v ON mc.`referencia_tipo` = 'VENTA' AND mc.`referencia_id` = v.`id`
                SET 
                  mc.`metodo_pago` = UPPER(COALESCE(v.`metodo_pago_detalle`, 'EFECTIVO')),
                  mc.`comprobante` = v.`codigo`
                WHERE mc.`metodo_pago` IS NULL OR mc.`metodo_pago` = 'EFECTIVO' OR mc.`metodo_pago` = ''
            ");
        } catch (\Throwable $e) {}

        // 3. Rellenar metodo_pago y comprobante desde la tabla abonos
        try {
            DB::statement("
                UPDATE `movimiento_caja` mc
                INNER JOIN `abonos` a ON (a.`movimiento_caja_id` = mc.`id` OR (mc.`referencia_tipo` = 'ABONO' AND mc.`referencia_id` = a.`cuenta_id`))
                SET 
                  mc.`metodo_pago` = UPPER(COALESCE(a.`metodo_pago`, 'EFECTIVO')),
                  mc.`comprobante` = COALESCE(a.`numero_operacion`, a.`referencia`)
                WHERE mc.`metodo_pago` IS NULL OR mc.`metodo_pago` = 'EFECTIVO' OR mc.`metodo_pago` = ''
            ");
        } catch (\Throwable $e) {}

        // 4. Asegurar valor 'EFECTIVO' para cualquier fila remanente
        DB::table('movimiento_caja')
            ->whereNull('metodo_pago')
            ->orWhere('metodo_pago', '')
            ->update(['metodo_pago' => 'EFECTIVO']);
    }

    public function down(): void
    {
        Schema::table('movimiento_caja', function (Blueprint $table) {
            if (Schema::hasColumn('movimiento_caja', 'conciliado_by')) {
                $table->dropForeign(['conciliado_by']);
                $table->dropColumn('conciliado_by');
            }
            if (Schema::hasColumn('movimiento_caja', 'comprobante')) {
                $table->dropColumn('comprobante');
            }
            if (Schema::hasColumn('movimiento_caja', 'metodo_pago')) {
                $table->dropColumn('metodo_pago');
            }
        });
    }
};
