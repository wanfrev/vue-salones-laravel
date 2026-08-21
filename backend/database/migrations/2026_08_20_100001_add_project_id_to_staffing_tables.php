<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_company_employees', function (Blueprint $table) {
            $table->uuid('project_id')->nullable()->after('company_id');
            $table->foreign('project_id')->references('id')->on('staffing_projects')->onDelete('set null');
        });

        Schema::table('staffing_timesheets', function (Blueprint $table) {
            $table->uuid('project_id')->nullable()->after('company_id');
            $table->foreign('project_id')->references('id')->on('staffing_projects')->onDelete('restrict');
            
            // Drop old unique constraint
            $table->dropUnique('unique_staffing_timesheet_company_week');
        });

        // Add partial unique indexes for timesheets using raw DB statements since Blueprint 
        // doesn't natively support partial unique indexes easily across all versions.
        // If project is null, we only allow one timesheet per week per company.
        DB::statement('CREATE UNIQUE INDEX idx_staffing_timesheet_company_week_null_proj ON staffing_timesheets (company_id, week_start) WHERE project_id IS NULL');
        // If project is not null, we allow one timesheet per project per week per company.
        DB::statement('CREATE UNIQUE INDEX idx_staffing_timesheet_company_week_proj ON staffing_timesheets (company_id, project_id, week_start) WHERE project_id IS NOT NULL');

        Schema::table('staffing_invoices', function (Blueprint $table) {
            $table->uuid('project_id')->nullable()->after('company_id');
            $table->foreign('project_id')->references('id')->on('staffing_projects')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_invoices', function (Blueprint $table) {
            $table->dropForeign(['project_id']);
            $table->dropColumn('project_id');
        });

        DB::statement('DROP INDEX IF EXISTS idx_staffing_timesheet_company_week_proj');
        DB::statement('DROP INDEX IF EXISTS idx_staffing_timesheet_company_week_null_proj');

        Schema::table('staffing_timesheets', function (Blueprint $table) {
            $table->unique(['company_id', 'week_start'], 'unique_staffing_timesheet_company_week');
            
            $table->dropForeign(['project_id']);
            $table->dropColumn('project_id');
        });

        Schema::table('staffing_company_employees', function (Blueprint $table) {
            $table->dropForeign(['project_id']);
            $table->dropColumn('project_id');
        });
    }
};
