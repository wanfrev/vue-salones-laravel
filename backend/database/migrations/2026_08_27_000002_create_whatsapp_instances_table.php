<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * A salon with several sucursales can have a different WhatsApp number connected at each one
 * (the number that greets a client is tied to whichever branch they're booking with) — the old
 * businesses.whatsapp_instance_* columns only ever held ONE connection for the whole business.
 *
 * `branch_id` nullable = the business's default/shared instance, used for any branch that never
 * got its own number connected (and for single-branch businesses, which just use this one row).
 * base_url/api_key stay on `businesses` — they're the Evolution API *server* config (one shared
 * server can host every instance for a business), not per-branch.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_instances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->string('instance_id')->nullable();
            $table->string('instance_status')->nullable()->default('disconnected');
            $table->string('instance_number')->nullable();
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->unique(['business_id', 'branch_id']);
        });

        // Carry over each business's existing single connection as its default (branch_id null)
        // instance — nobody who's already connected has to reconnect/rescan just because this
        // feature shipped.
        $businesses = DB::table('businesses')
            ->whereNotNull('whatsapp_instance_id')
            ->select('id', 'whatsapp_instance_id', 'whatsapp_instance_status', 'whatsapp_instance_number')
            ->get();

        foreach ($businesses as $business) {
            DB::table('whatsapp_instances')->insert([
                'id' => (string) Str::uuid(),
                'business_id' => $business->id,
                'branch_id' => null,
                'instance_id' => $business->whatsapp_instance_id,
                'instance_status' => $business->whatsapp_instance_status,
                'instance_number' => $business->whatsapp_instance_number,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_instance_id', 'whatsapp_instance_status', 'whatsapp_instance_number']);
        });
    }

    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->string('whatsapp_instance_id')->nullable();
            $table->string('whatsapp_instance_status')->nullable()->default('disconnected');
            $table->string('whatsapp_instance_number')->nullable();
        });

        $default = DB::table('whatsapp_instances')->whereNull('branch_id')->get();
        foreach ($default as $row) {
            DB::table('businesses')->where('id', $row->business_id)->update([
                'whatsapp_instance_id' => $row->instance_id,
                'whatsapp_instance_status' => $row->instance_status,
                'whatsapp_instance_number' => $row->instance_number,
            ]);
        }

        Schema::dropIfExists('whatsapp_instances');
    }
};
