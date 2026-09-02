<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * unique(['business_id', 'branch_id']) from 2026_08_27_000002 doesn't actually stop a business
 * from ending up with two "default" (branch_id NULL) instances — plain SQL unique constraints
 * treat every NULL as distinct from every other NULL, so two default rows would sail right
 * through it. Same footgun already fixed once for staffing_company_employees
 * (2026_08_24_000001) via a COALESCE-based expression index; this applies the identical fix
 * here. WhatsAppService::findInstance()/resolveSendingInstance() both assume at most one row per
 * (business_id, branch_id) — a stray duplicate default would make ->first() pick an arbitrary
 * one, silently pointing sends/QR/status at the wrong connection.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Dedupe first (defensive) — keep the oldest row per (business_id, branch_id), matching
        // the same "earliest wins" rule used for staffing_company_employees's cleanup.
        DB::statement(<<<'SQL'
            DELETE FROM whatsapp_instances
            WHERE id IN (
                SELECT id
                FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY business_id, branch_id
                               ORDER BY created_at ASC, id ASC
                           ) AS rn
                    FROM whatsapp_instances
                ) ranked
                WHERE rn > 1
            )
        SQL);

        Schema::table('whatsapp_instances', function (Blueprint $table) {
            $table->dropUnique(['business_id', 'branch_id']);
        });

        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX whatsapp_instances_business_branch_unique
            ON whatsapp_instances (business_id, COALESCE(branch_id::text, ''))
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS whatsapp_instances_business_branch_unique');

        Schema::table('whatsapp_instances', function (Blueprint $table) {
            $table->unique(['business_id', 'branch_id']);
        });
    }
};
