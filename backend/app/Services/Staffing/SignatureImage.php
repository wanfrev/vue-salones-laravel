<?php

namespace App\Services\Staffing;

use InvalidArgumentException;

/**
 * Gatekeeper for a drawn signature before it is stored or ever placed in a printed document.
 * Pure (no framework), so it is unit tested directly.
 *
 * Only a real PNG passes: the value ends up inside an <img src="…"> in printable HTML and inside a
 * spreadsheet, so anything that is not strictly `data:image/png;base64,<bytes of a PNG>` — SVG,
 * HTML, a javascript: URL, a truncated or oversized payload — is rejected up front.
 */
final class SignatureImage
{
    public const MAX_BYTES = 150_000;

    private const PNG_MAGIC = "\x89PNG\r\n\x1a\n";

    /** @throws InvalidArgumentException */
    public static function validate(string $dataUrl): string
    {
        if (!preg_match('#^data:image/png;base64,([A-Za-z0-9+/]+={0,2})$#', $dataUrl, $m)) {
            throw new InvalidArgumentException('La firma debe ser una imagen PNG.');
        }

        $bytes = base64_decode($m[1], true);
        if ($bytes === false || !str_starts_with($bytes, self::PNG_MAGIC)) {
            throw new InvalidArgumentException('La firma no es una imagen PNG válida.');
        }
        if (strlen($bytes) > self::MAX_BYTES) {
            throw new InvalidArgumentException('La firma es demasiado grande. Dibújala más pequeña.');
        }

        return $dataUrl;
    }

    /** Raw PNG bytes of an already validated data URL. */
    public static function bytes(string $dataUrl): string
    {
        return (string) base64_decode(substr($dataUrl, strlen('data:image/png;base64,')), true);
    }
}
