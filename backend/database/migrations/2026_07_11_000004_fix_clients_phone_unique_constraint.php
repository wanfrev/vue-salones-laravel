<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function ($table) {
            $table->dropUnique('clients_business_id_phone_key');
        });

        DB::statement('CREATE UNIQUE INDEX clients_unique_phone_branch_idx ON public.clients (business_id, phone, branch_id) WHERE branch_id IS NOT NULL AND phone IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX clients_unique_phone_global_idx ON public.clients (business_id, phone) WHERE branch_id IS NULL AND phone IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS public.clients_unique_phone_branch_idx');
        DB::statement('DROP INDEX IF EXISTS public.clients_unique_phone_global_idx');

        Schema::table('clients', function ($table) {
            $table->unique(['business_id', 'phone'], 'clients_business_id_phone_key');
        });
    }
};
