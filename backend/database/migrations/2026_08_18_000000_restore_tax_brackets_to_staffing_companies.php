<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Restores `tax_brackets`/`tax_destination`, dropped by
 * 2026_08_14_100000_remove_tax_brackets_from_staffing_companies.php when no UI set them. The
 * engine (TaxRule::tiered/dyke, StaffingTermsFactory::taxRuleFor) and the controller's validation
 * rules never stopped expecting these columns — only the columns themselves were missing. Now
 * some companies need a real tiered rule again (e.g. 3.5% under $500, 7% at/above $500), editable
 * per company, alongside the flat `tax_rate` every other company still uses.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_companies', 'tax_brackets')) {
            return;
        }

        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->jsonb('tax_brackets')->nullable();
            $table->string('tax_destination')->default('remitted');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->dropColumn(['tax_brackets', 'tax_destination']);
        });
    }
};
