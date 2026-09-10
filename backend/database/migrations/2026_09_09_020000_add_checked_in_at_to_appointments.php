<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Deliberately NOT a new `status` value — see PatientDentalShell/Gabinete plan notes.
            // `status` is shared across every niche with no single source of truth for its
            // vocabulary (validation, commissions, POS eligibility, reminders all hardcode it
            // separately); a nullable timestamp here is orthogonal to all of that and stays NULL
            // — invisible, no behavior change — for every business outside odontología.
            $table->timestamp('checked_in_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('checked_in_at');
        });
    }
};
