<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * gift_cards_amount_check se creo directo en produccion (no habia migracion para ella) como
 * CHECK (amount > 0) -- pero una gift card totalmente consumida (PosService::processSale())
 * guarda amount = 0 y status = 'redeemed' a proposito, ese es su estado final legitimo. La
 * restriccion nunca permitia llegar ahi, asi que cobrar el ultimo centavo de una gift card
 * tiraba un error de SQL crudo en vez de completar el cobro. Se reemplaza por >= 0 (sigue
 * bloqueando montos negativos, que es lo que la restriccion original probablemente queria evitar).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_amount_check');
        DB::statement('ALTER TABLE gift_cards ADD CONSTRAINT gift_cards_amount_check CHECK (amount >= 0)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_amount_check');
        DB::statement('ALTER TABLE gift_cards ADD CONSTRAINT gift_cards_amount_check CHECK (amount > 0)');
    }
};
