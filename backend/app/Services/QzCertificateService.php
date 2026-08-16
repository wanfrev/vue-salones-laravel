<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * A self-signed root certificate + private key that lets QZ Tray (the local print bridge) trust
 * requests coming from Luma and verify they weren't tampered with — the free alternative to
 * QZ Industries' paid CA-signed certificate. One certificate for the whole app, not per business:
 * QZ Tray just needs to know "this is Luma", not which of Luma's businesses is printing.
 *
 * The operator sees one "allow this app?" prompt from QZ Tray the first time their machine
 * connects; after they check "remember", every print after that is silent.
 */
class QzCertificateService
{
    private const DISK = 'local';
    private const CERT_PATH = 'private/qz/certificate.pem';
    private const KEY_PATH = 'private/qz/private.pem';

    public function certificateExists(): bool
    {
        return Storage::disk(self::DISK)->exists(self::CERT_PATH)
            && Storage::disk(self::DISK)->exists(self::KEY_PATH);
    }

    public function generate(): void
    {
        $config = [
            'digest_alg' => 'sha256',
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ];

        $privateKey = openssl_pkey_new($config);
        if ($privateKey === false) {
            throw new RuntimeException('No se pudo generar la llave privada: ' . openssl_error_string());
        }

        $csr = openssl_csr_new([
            'commonName' => 'Luma POS',
            'organizationName' => 'Luma',
        ], $privateKey, $config);
        if ($csr === false) {
            throw new RuntimeException('No se pudo generar el CSR: ' . openssl_error_string());
        }

        // Self-signed (no issuer cert) — valid 20 years, this is a bridge trust anchor, not a
        // publicly verified identity, so there's no CA to renew against.
        $cert = openssl_csr_sign($csr, null, $privateKey, 20 * 365, $config);
        if ($cert === false) {
            throw new RuntimeException('No se pudo firmar el certificado: ' . openssl_error_string());
        }

        openssl_x509_export($cert, $certPem);
        openssl_pkey_export($privateKey, $keyPem);

        Storage::disk(self::DISK)->put(self::CERT_PATH, $certPem);
        Storage::disk(self::DISK)->put(self::KEY_PATH, $keyPem);
    }

    public function certificate(): string
    {
        if (!$this->certificateExists()) {
            $this->generate();
        }

        return Storage::disk(self::DISK)->get(self::CERT_PATH);
    }

    /** Base64-encoded SHA512withRSA signature — the algorithm qzPrinter.ts pins on the JS side. */
    public function sign(string $message): string
    {
        if (!$this->certificateExists()) {
            $this->generate();
        }

        $privateKeyPem = Storage::disk(self::DISK)->get(self::KEY_PATH);
        $privateKey = openssl_pkey_get_private($privateKeyPem);
        if ($privateKey === false) {
            throw new RuntimeException('No se pudo leer la llave privada de QZ: ' . openssl_error_string());
        }

        openssl_sign($message, $signature, $privateKey, OPENSSL_ALGO_SHA512);

        return base64_encode($signature);
    }
}
