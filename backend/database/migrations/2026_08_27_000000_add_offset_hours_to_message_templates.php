<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How many hours before (appointment_reminder) or after (follow_up) a template fires — lets a
 * business run several reminder/follow-up templates at once (24h before, 1h before, 2h after
 * service ends, ...) instead of just one active template per type. Direction is implied by
 * `type`, not stored here: reminder counts back from `start_time`, follow_up counts forward from
 * `end_time`. Irrelevant for appointment_confirmation, which fires at booking time.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('message_templates', function (Blueprint $table) {
            $table->decimal('offset_hours', 6, 2)->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('message_templates', function (Blueprint $table) {
            $table->dropColumn('offset_hours');
        });
    }
};
