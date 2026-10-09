<?php

namespace Tests\Feature\Clinical;

use Illuminate\Support\Facades\Schema;

/**
 * Esquema mínimo para probar el módulo clínico sobre SQLite en memoria: las tablas padre con solo
 * las columnas que usan los servicios + las migraciones clínicas reales (FK apagados). El resto del
 * esquema del proyecto usa características de Postgres y no corre en SQLite.
 */
trait BuildsClinicalSchema
{
    protected function buildClinicalSchema(): void
    {
        config(['app.cipher' => 'AES-256-CBC', 'app.key' => 'base64:' . base64_encode(random_bytes(32))]);
        $this->app->forgetInstance('encrypter');

        Schema::disableForeignKeyConstraints();

        Schema::create('clients', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->uuid('branch_id')->nullable();
            $t->string('full_name')->nullable();
            $t->string('phone')->nullable();
            $t->string('client_code')->nullable();
            $t->string('document_id')->nullable();
        });
        Schema::create('profiles', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->string('full_name')->nullable();
            $t->string('role')->nullable();
        });
        Schema::create('services', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->string('name');
            $t->integer('duration_minutes')->nullable();
            $t->decimal('price', 10, 2)->nullable();
            $t->uuid('linked_product_id')->nullable();
            $t->uuid('linked_variant_id')->nullable();
        });
        // Con las columnas que AppointmentService::store escribe: los programas crean citas de verdad.
        Schema::create('appointments', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
            $t->uuid('client_id');
            $t->uuid('pet_id')->nullable();
            $t->uuid('employee_id')->nullable();
            $t->uuid('assistant_employee_id')->nullable();
            $t->uuid('service_id')->nullable();
            $t->timestamp('start_time')->nullable();
            $t->timestamp('end_time')->nullable();
            $t->string('status')->nullable();
            $t->string('payment_status')->default('unpaid');
            $t->text('service_notes')->nullable();
            $t->text('internal_notes')->nullable();
            $t->string('source')->nullable();
            $t->uuid('created_by')->nullable();
            $t->uuid('group_id')->nullable();
            $t->decimal('price_override', 10, 2)->nullable();
            $t->decimal('employee_percentage_override', 6, 2)->nullable();
            $t->decimal('assistant_percentage', 6, 2)->nullable();
            $t->boolean('is_fixed_commission_override')->nullable();
            $t->decimal('employee_amount_override', 10, 2)->nullable();
            $t->decimal('assistant_amount_override', 10, 2)->nullable();
            $t->integer('duration_override')->nullable();
            $t->text('diagnosis')->nullable();
            $t->text('treatment')->nullable();
            $t->text('associated_products')->nullable();
            $t->text('clinical_history')->nullable();
            $t->timestamp('created_at')->nullable();
            $t->timestamp('updated_at')->nullable();
        });
        Schema::create('transactions', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('appointment_id')->nullable();
        });

        $files = glob(database_path('migrations/2026_10_0[58]_00000*.php'));
        sort($files); // el nombre lleva el orden: las que alteran tablas van después de las que las crean
        foreach ($files as $file) {
            (require $file)->up();
        }
    }
}
