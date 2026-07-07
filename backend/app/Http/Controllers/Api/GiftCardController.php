<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\GiftCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GiftCardController
{
    public function __construct(
        private GiftCardService $giftCardService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->giftCardService->list($p->business_id, $request->branch_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'recipient_name' => 'required|string|max:255',
            'recipient_phone' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
            'branch_id' => 'nullable|uuid',
        ]);

        $giftCard = $this->giftCardService->store($data, $p->business_id, $user->id);
        EntityChanged::dispatch($p->business_id, 'gift_card', 'created', $giftCard->id);
        return response()->json($giftCard, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'recipient_name' => 'sometimes|string|max:255',
            'recipient_phone' => 'nullable|string|max:50',
            'amount' => 'sometimes|numeric|min:0.01',
            'status' => 'sometimes|in:active,redeemed,expired',
            'notes' => 'nullable|string',
        ]);

        $giftCard = $this->giftCardService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'gift_card', 'updated', $id);
        return response()->json($giftCard);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->giftCardService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'gift_card', 'deleted', $id);
        return response()->json(null, 204);
    }
}
