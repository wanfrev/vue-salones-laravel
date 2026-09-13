<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Un negocio puede recibir pagos en bolivares (pago movil, transferencia, punto de venta) en
 * varias cuentas bancarias distintas -- esta tabla es la lista de bancos que cada negocio arma
 * por su cuenta (Banesco, BNC, Mercantil, etc.) para poder elegir cual se uso al cobrar.
 * No aplica al nicho staffing (no vende por Punto de Venta).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->string('name');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->unique(['business_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banks');
    }
};
