<?php

namespace App\Services;

use App\Models\Business;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BusinessService
{
    public function show(string $id): Business
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }
        return $business;
    }

    public function update(string $id, array $data, ?string $profileBusinessId): Business
    {
        $business = Business::find($id);

        if (!$business || $business->id !== $profileBusinessId) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $business->update($data + ['updated_at' => now()]);

        return $business->fresh();
    }

    public function getFeatures(string $id): array
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }
        return $business->features ?? [];
    }

    public function getExchangeRate(string $id): float
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }
        return (float) ($business->ves_exchange_rate ?? 1);
    }

    public function updateExchangeRate(string $id, float $rate, ?string $profileBusinessId): Business
    {
        return $this->update($id, ['ves_exchange_rate' => $rate], $profileBusinessId);
    }
}
