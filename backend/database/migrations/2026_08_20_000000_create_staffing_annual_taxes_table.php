<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_annual_taxes')) {
            return;
        }

        Schema::create('staffing_annual_taxes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('employee_id');
            
            $table->unsignedSmallInteger('year');
            $table->string('status')->default('blank'); // blank, sent_employee, sent_accountant, pending
            $table->string('file_path')->nullable();
            $table->string('file_original_name')->nullable();
            $table->date('file_date')->nullable();
            
            $table->uuid('created_by')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('profiles')->onDelete('cascade');

            $table->unique(['employee_id', 'year'], 'unique_staffing_annual_tax_emp_year');
            $table->index(['business_id', 'year'], 'idx_staffing_annual_taxes_biz_yr');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_annual_taxes');
    }
};
