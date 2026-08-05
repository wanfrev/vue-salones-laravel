<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * La tabla `transactions` viene del esquema heredado de Supabase, no de una
 * migración de este repo, así que no hay forma de saber leyendo el código si
 * `method` tiene un CHECK que limite los valores aceptados.
 *
 * Al agregar Binance y Cashea como métodos de cobro del POS, un CHECK viejo
 * haría fallar la venta con un error de base de datos. Esta migración busca
 * cualquier CHECK sobre esa columna y lo elimina: la validación de métodos
 * vive en la aplicación (`string|max:50`), que es donde se agregan métodos
 * nuevos sin tener que migrar la base cada vez.
 *
 * Si no existe ningún CHECK, no hace nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql' || !Schema::hasTable('transactions')) {
            return;
        }

        foreach ($this->methodCheckConstraints() as $name) {
            DB::statement("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS \"{$name}\"");
        }
    }

    public function down(): void
    {
        // No se recrea: no sabemos qué valores permitía el CHECK original, y
        // recrearlo con una lista incompleta rompería ventas ya existentes.
    }

    /**
     * @return array<int, string>
     */
    private function methodCheckConstraints(): array
    {
        $rows = DB::select(<<<'SQL'
            SELECT con.conname AS name
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE rel.relname = 'transactions'
              AND nsp.nspname = current_schema()
              AND con.contype = 'c'
              AND pg_get_constraintdef(con.oid) ILIKE '%method%'
        SQL);

        return array_map(fn ($row) => $row->name, $rows);
    }
};
