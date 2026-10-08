<?php

namespace App\Services\Staffing;

/**
 * The verification code printed on an approved payroll week ("NOM-7F3K-92QA"). Pure — no database,
 * no framework — so it is unit tested directly.
 *
 * The code is an HMAC (keyed with the app secret, so nobody can forge one by hand) over the week's
 * identity, who approved and when, and each entry's hours and pay. Recomputing it later from the
 * stored numbers and comparing proves nothing was edited after approval: change one hour or one
 * payout and the code no longer matches.
 */
final class ApprovalStamp
{
    /** No 0/O/1/I — a code read aloud or copied off paper must not be ambiguous. */
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    /**
     * @param array{timesheet_id: string, company_id: string, project_id: ?string, week_start: string, approved_by: string, approved_at: string} $facts
     * @param list<array{employee_id: string, role: ?string, shift: ?string, total_hours: float|int|string, gross: float|int|string, payout: float|int|string}> $lines
     */
    public static function code(string $secret, array $facts, array $lines): string
    {
        usort($lines, fn ($a, $b) => strcmp(self::lineKey($a), self::lineKey($b)));

        $payload = implode("\n", [
            $facts['timesheet_id'], $facts['company_id'], $facts['project_id'] ?? '',
            $facts['week_start'], $facts['approved_by'], $facts['approved_at'],
            ...array_map(fn ($l) => self::lineKey($l) . '|' . self::money($l['total_hours']) . '|' . self::money($l['gross']) . '|' . self::money($l['payout']), $lines),
        ]);

        $raw = hash_hmac('sha256', $payload, $secret, true);

        $bits = '';
        for ($i = 0; $i < 5; $i++) {
            $bits .= str_pad(decbin(ord($raw[$i])), 8, '0', STR_PAD_LEFT);
        }
        $symbols = '';
        foreach (str_split($bits, 5) as $chunk) {
            $symbols .= self::ALPHABET[bindec($chunk)];
        }

        return 'NOM-' . substr($symbols, 0, 4) . '-' . substr($symbols, 4, 4);
    }

    /** Lets a person type the code in lowercase, with spaces or without the dashes. */
    public static function normalize(string $input): string
    {
        $clean = preg_replace('/[^A-Z0-9]/', '', strtoupper($input)) ?? '';
        $clean = str_starts_with($clean, 'NOM') ? substr($clean, 3) : $clean;

        return strlen($clean) === 8 ? 'NOM-' . substr($clean, 0, 4) . '-' . substr($clean, 4, 4) : strtoupper(trim($input));
    }

    private static function lineKey(array $l): string
    {
        return $l['employee_id'] . '|' . ($l['role'] ?? '') . '|' . ($l['shift'] ?? '');
    }

    private static function money(float|int|string $v): string
    {
        return number_format((float) $v, 2, '.', '');
    }
}
