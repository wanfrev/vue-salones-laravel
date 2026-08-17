<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Replaces the single profiles.staffing_company_id/staffing_role columns with a real
 * many-to-many: a staffing worker can be assigned to more than one client company at the same
 * time, and rates are per (company, role) — so the role has to live per-assignment too, not once
 * on the profile. profiles.staffing_company_id/staffing_role are left in place (unused by the
 * app from here on) rather than dropped — nothing reads them anymore, but dropping columns is
 * a one-way door and there's no upside to taking it today.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staffing_company_employees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('company_id');
            $table->uuid('employee_id');
            $table->string('role');
            $table->timestamps();

            // One row per (company, employee) — re-assigning just updates the role on it instead
            // of piling up duplicates.
            $table->unique(['company_id', 'employee_id']);
            $table->index('business_id');
            $table->index('employee_id');

            $table->foreign('company_id')->references('id')->on('staffing_companies')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('profiles')->onDelete('cascade');
        });

        // Backfill: every employee's existing single assignment becomes their first row here.
        DB::table('profiles')
            ->whereNotNull('staffing_company_id')
            ->select('id', 'business_id', 'staffing_company_id', 'staffing_role')
            ->orderBy('id')
            ->each(function ($profile) {
                DB::table('staffing_company_employees')->insert([
                    'id' => Str::uuid()->toString(),
                    'business_id' => $profile->business_id,
                    'company_id' => $profile->staffing_company_id,
                    'employee_id' => $profile->id,
                    'role' => $profile->staffing_role ?: 'Sin rol',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_company_employees');
    }
};
