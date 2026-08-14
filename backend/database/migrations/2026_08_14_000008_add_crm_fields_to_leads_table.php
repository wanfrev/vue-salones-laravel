<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fields the client's CRM sheet tracks that the original leads table didn't: contact email,
 * when the site was visited, a free-text company category (no fixed catalog confirmed yet by
 * the client), priority, a "tarjeta de contacto" column that must exist but has no behaviour
 * behind it yet, and the US state. `status` itself is unchanged — its display labels move to
 * "Estado del Seguimiento" in the UI only, not a new column.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('leads', 'email')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table) {
            $table->string('email')->nullable()->after('phone');
            $table->date('visit_date')->nullable()->after('status');
            $table->string('company_category')->nullable()->after('visit_date');
            // 'low' | 'medium' | 'high'
            $table->string('priority')->nullable()->after('company_category');
            // No functionality behind this yet — see the migration docblock.
            $table->string('contact_card')->nullable()->after('priority');
            // Free text — the client's sheet shows the full state name (e.g. "Georgia"), not
            // an abbreviation, so this isn't constrained to 2 characters.
            $table->string('state')->nullable()->after('contact_card');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['email', 'visit_date', 'company_category', 'priority', 'contact_card', 'state']);
        });
    }
};
