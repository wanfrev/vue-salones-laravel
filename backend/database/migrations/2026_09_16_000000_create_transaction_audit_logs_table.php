<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            // No FK/cascade a transactions: una eliminación debe seguir siendo legible después de
            // que la fila original ya no existe, así que esto guarda una copia (snapshot), no una
            // referencia que se vuelve huérfana.
            $table->uuid('transaction_id');
            $table->uuid('branch_id')->nullable();
            $table->enum('action', ['updated', 'deleted']);
            $table->uuid('performed_by')->nullable();
            $table->string('reason', 500)->nullable();
            $table->jsonb('before_snapshot');
            $table->jsonb('after_snapshot')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['business_id', 'created_at']);
            $table->index(['transaction_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_audit_logs');
    }
};
