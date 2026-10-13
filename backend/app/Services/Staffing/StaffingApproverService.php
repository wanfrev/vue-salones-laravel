<?php

namespace App\Services\Staffing;

use App\Models\StaffingApprover;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The bosses who can sign off a payroll week when several people share one admin login. A PIN
 * (hashed, rate limited) is what proves "it was me" at approval time — picking a name alone would
 * let anyone sit at the shared account and approve as someone else.
 */
class StaffingApproverService
{
    public const MAX_PER_BUSINESS = 20;
    private const MAX_PIN_ATTEMPTS = 5;
    private const LOCK_SECONDS = 300;

    /** @return Collection<int, StaffingApprover> */
    public function list(string $businessId): Collection
    {
        if (!StaffingApprover::tableExists()) {
            return collect();
        }

        return StaffingApprover::where('business_id', $businessId)->where('active', true)->orderBy('name')->get();
    }

    public function hasAny(string $businessId): bool
    {
        return $this->list($businessId)->isNotEmpty();
    }

    public function create(string $businessId, string $name, string $pin): StaffingApprover
    {
        $this->assertTable();

        if (StaffingApprover::where('business_id', $businessId)->where('active', true)->count() >= self::MAX_PER_BUSINESS) {
            throw new RuntimeException('Se alcanzó el máximo de firmantes (' . self::MAX_PER_BUSINESS . ').');
        }

        return StaffingApprover::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'name' => trim($name),
            'pin_hash' => Hash::make($pin),
            'active' => true,
        ]);
    }

    /**
     * Changing a name or PIN needs the CURRENT PIN: since everyone is on the same login, without it
     * any of them could take over another boss's identity by resetting their PIN.
     *
     * @param array{name?: string, new_pin?: string} $changes
     */
    public function update(string $id, string $businessId, string $currentPin, array $changes): StaffingApprover
    {
        $approver = $this->authenticate($businessId, $id, $currentPin);

        $values = [];
        if (isset($changes['name'])) {
            $values['name'] = trim($changes['name']);
        }
        if (!empty($changes['new_pin'])) {
            $values['pin_hash'] = Hash::make($changes['new_pin']);
        }

        $approver->update($values);

        return $approver->fresh();
    }

    public function delete(string $id, string $businessId, string $pin): void
    {
        // Soft: past approvals keep their frozen name, so this only stops new use.
        $this->authenticate($businessId, $id, $pin)->update(['active' => false]);
    }

    /**
     * Checks the PIN for one approver. After 5 wrong tries that approver is locked for 5 minutes,
     * so the shared login can't be used to guess a colleague's PIN.
     *
     * @throws RuntimeException wrong PIN / locked
     */
    public function authenticate(string $businessId, string $id, string $pin): StaffingApprover
    {
        $this->assertTable();

        $approver = StaffingApprover::where('business_id', $businessId)->where('active', true)->find($id);
        if (!$approver) {
            throw new NotFoundHttpException('Firmante no encontrado.');
        }

        $key = 'staffing-approver:' . $approver->id;
        if (RateLimiter::tooManyAttempts($key, self::MAX_PIN_ATTEMPTS)) {
            $minutes = (int) ceil(RateLimiter::availableIn($key) / 60);
            throw new RuntimeException("Demasiados intentos con el PIN de {$approver->name}. Intenta de nuevo en {$minutes} min.");
        }

        if (!Hash::check($pin, $approver->pin_hash)) {
            RateLimiter::hit($key, self::LOCK_SECONDS);
            throw new RuntimeException('PIN incorrecto.');
        }

        RateLimiter::clear($key);

        return $approver;
    }

    private function assertTable(): void
    {
        if (!StaffingApprover::tableExists()) {
            throw new RuntimeException('Los firmantes aún no están disponibles en este servidor.');
        }
    }
}
