<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Un crédito sin pagar puede corregirse (monto mal cargado) o cerrarse dando por cobrado el saldo. En ambos casos
 * `amount` baja, así que aquí queda el monto con el que nació: sirve de rastro y para que «lo pagado al vender»
 * (venta − lo que quedó a crédito) no cambie al corregir. NULL = nunca se corrigió.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credits', function (Blueprint $table) {
            $table->decimal('original_amount', 12, 2)->nullable()->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('credits', function (Blueprint $table) {
            $table->dropColumn('original_amount');
        });
    }
};
