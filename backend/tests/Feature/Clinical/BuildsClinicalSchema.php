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
        });
        Schema::create('profiles', function ($t) {
            $t->uuid('id')->primary();
            $t->string('full_name')->nullable();
        });
        Schema::create('services', function ($t) {
            $t->uuid('id')->primary();
            $t->string('name');
        });
        Schema::create('appointments', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('client_id');
            $t->uuid('employee_id')->nullable();
            $t->uuid('service_id')->nullable();
            $t->timestamp('start_time')->nullable();
            $t->string('status')->nullable();
        });

        $files = glob(database_path('migrations/2026_10_05_00000*.php'));
        sort($files); // el nombre lleva el orden: las que alteran tablas van después de las que las crean
        foreach ($files as $file) {
            (require $file)->up();
        }
    }
}
