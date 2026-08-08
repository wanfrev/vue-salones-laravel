<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Client companies a staffing agency places workers into — the "BILL TO" of the payroll sheets.
 * Distinct from `businesses`, which is the agency itself (the tenant).
 *
 * The payroll rules live here rather than in global config because the real sheets differ per
 * client: DYKE withholds 3.5%/7% and pays whole dollars, HILTON withholds nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_companies')) {
            return;
        }

        Schema::create('staffing_companies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();

            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip')->nullable();
            // Printed on the invoice as "Work Site" — where the crew actually reports.
            $table->string('work_site')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_email')->nullable();

            $table->unsignedSmallInteger('payment_terms_days')->default(15);

            // Overtime split. 40h at 1.5x is the sheets' rule and the federal default, but it is
            // stored per company so a contract with different terms does not need a code change.
            $table->decimal('overtime_threshold_hours', 8, 2)->default(40);
            $table->decimal('overtime_multiplier', 8, 2)->default(1.5);

            /**
             * Ordered brackets, e.g. [{"threshold":500,"rate":0.035},{"threshold":null,"rate":0.07}].
             * `threshold` is an EXCLUSIVE upper bound and the matched rate applies to the WHOLE
             * base, not marginally — see App\Services\Staffing\TaxRule. An empty array means no
             * withholding at all.
             */
            $table->jsonb('tax_brackets')->nullable();
            // 'remitted' = paid onward as a liability; 'retained' = kept by the agency as a fee.
            // Decides whether the withholding counts as cost or margin.
            $table->string('tax_destination')->default('remitted');
            // 'floor' drops the cents (DYKE pays $852 on a $852.83 net), 'cent', or 'exact'.
            $table->string('payout_rounding')->default('cent');

            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');

            $table->index(['business_id', 'active'], 'idx_staffing_companies_biz_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_companies');
    }
};
