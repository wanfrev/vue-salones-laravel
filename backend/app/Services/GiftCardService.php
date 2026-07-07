<?php

namespace App\Services;

use App\Models\GiftCard;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class GiftCardService
{
    public function list(string $businessId, ?string $branchId = null): Collection
    {
        $query = GiftCard::where('business_id', $businessId)
            ->orderByDesc('created_at');

        if ($branchId) $query->where('branch_id', $branchId);

        return $query->get();
    }

    public function store(array $data, string $businessId, string $createdBy): GiftCard
    {
        return GiftCard::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'recipient_name' => $data['recipient_name'],
            'recipient_phone' => $data['recipient_phone'] ?? null,
            'amount' => $data['amount'],
            'status' => 'active',
            'notes' => $data['notes'] ?? null,
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): GiftCard
    {
        $giftCard = $this->findForBusiness($id, $businessId);
        $giftCard->update($data + ['updated_at' => now()]);
        return $giftCard->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $giftCard = $this->findForBusiness($id, $businessId);
        $giftCard->delete();
    }

    public function findForBusiness(string $id, string $businessId): GiftCard
    {
        $giftCard = GiftCard::find($id);
        if (!$giftCard || $giftCard->business_id !== $businessId) {
            throw new NotFoundHttpException('Gift card no encontrada.');
        }
        return $giftCard;
    }
}
