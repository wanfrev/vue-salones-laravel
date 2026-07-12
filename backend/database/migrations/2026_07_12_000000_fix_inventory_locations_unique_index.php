<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_locations', function ($table) {
            $table->dropUnique('inventory_locations_business_id_name_key');
        });

        DB::statement('CREATE UNIQUE INDEX inventory_locations_unique_branch_idx ON public.inventory_locations (business_id, name, branch_id) WHERE branch_id IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX inventory_locations_unique_global_idx ON public.inventory_locations (business_id, name) WHERE branch_id IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS public.inventory_locations_unique_branch_idx');
        DB::statement('DROP INDEX IF EXISTS public.inventory_locations_unique_global_idx');

        Schema::table('inventory_locations', function ($table) {
            $table->unique(['business_id', 'name'], 'inventory_locations_business_id_name_key');
        });
    }
};
