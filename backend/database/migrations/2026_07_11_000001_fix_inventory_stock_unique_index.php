<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS public.inventory_stock_unique_idx');

        DB::statement('CREATE UNIQUE INDEX inventory_stock_unique_branch_idx ON public.inventory_stock (location_id, product_id, variant_id, branch_id) WHERE branch_id IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX inventory_stock_unique_global_idx ON public.inventory_stock (location_id, product_id, variant_id) WHERE branch_id IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS public.inventory_stock_unique_branch_idx');
        DB::statement('DROP INDEX IF EXISTS public.inventory_stock_unique_global_idx');

        DB::statement('CREATE UNIQUE INDEX inventory_stock_unique_idx ON public.inventory_stock (location_id, product_id, variant_id)');
    }
};
