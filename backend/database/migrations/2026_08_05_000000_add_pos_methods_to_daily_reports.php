<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Alinea los campos del reporte diario con los métodos de cobro del POS.
 *
 * Antes, el POS podía cobrar con Tarjeta, Gift Card u "Otro" pero el reporte
 * diario no tenía dónde reflejarlos, así que ese dinero simplemente no
 * aparecía al cuadrar el día. Con estas columnas cada método del POS tiene
 * destino y el total del reporte cuadra con lo efectivamente cobrado.
 */
return new class extends Migration
{
    private const COLUMNS = [
        'card_usd',
        'gift_card_usd',
        'other_usd',
        'other_bs',
    ];

    public function up(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            foreach (self::COLUMNS as $column) {
                if (!Schema::hasColumn('daily_reports', $column)) {
                    $table->decimal($column, 15, 2)->default(0);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            foreach (self::COLUMNS as $column) {
                if (Schema::hasColumn('daily_reports', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
