<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Staffing workers still need a `profiles` row (payroll reads employee_id off timesheet
 * entries), but they never log in — the company + role they're assigned drives their pay
 * instead of pay_type/pay_percentage/base_salary. Every column here is nullable, so every
 * other niche is unaffected.
 *
 * Bank/card numbers are real financial data and are cast `encrypted` on the model (see
 * App\Models\Profile) and hidden from every JSON response — the API can accept a new number
 * but never returns one back in full, only the last 4 digits via an accessor.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->uuid('staffing_company_id')->nullable();
            $table->string('staffing_role')->nullable();

            $table->string('bank_name')->nullable();
            $table->string('bank_account_holder')->nullable();
            // 'checking' | 'savings'
            $table->string('bank_account_type')->nullable();
            // 'direct_deposit' | 'payroll_card'
            $table->string('payment_method')->nullable();

            // text, not string: Laravel's `encrypted` cast stores ciphertext that runs well
            // past varchar(255) even for a short plaintext routing number.
            $table->text('bank_routing_number')->nullable();
            $table->text('bank_account_number')->nullable();
            $table->text('payroll_card_number')->nullable();

            $table->foreign('staffing_company_id')->references('id')->on('staffing_companies')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropForeign(['staffing_company_id']);
            $table->dropColumn([
                'staffing_company_id', 'staffing_role',
                'bank_name', 'bank_account_holder', 'bank_account_type', 'payment_method',
                'bank_routing_number', 'bank_account_number', 'payroll_card_number',
            ]);
        });
    }
};
