<?php

namespace App\Console\Commands;

use App\Services\QzCertificateService;
use Illuminate\Console\Command;

/**
 * Generates the self-signed certificate QZ Tray (the local print bridge) uses to trust Luma.
 * Safe to run once during deploy — QzCertificateService also generates it lazily on first use if
 * this was never run, so this command exists for predictability, not because it's required.
 */
class QzGenerateCertificate extends Command
{
    protected $signature = 'qz:generate-certificate {--force : Overwrite an existing certificate}';
    protected $description = 'Generate the self-signed certificate/key QZ Tray uses to trust and verify print requests from Luma.';

    public function handle(QzCertificateService $qz): int
    {
        if ($qz->certificateExists() && !$this->option('force')) {
            $this->info('El certificado de QZ Tray ya existe. Usa --force para regenerarlo.');
            $this->warn('Regenerarlo invalida la confianza ya otorgada en las PCs donde QZ Tray quedó configurado — habrá que aceptar el aviso de nuevo en cada una.');
            return self::SUCCESS;
        }

        $qz->generate();
        $this->info('Certificado de QZ Tray generado correctamente.');

        return self::SUCCESS;
    }
}
