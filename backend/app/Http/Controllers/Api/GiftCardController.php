<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\Business;
use App\Services\GiftCardPaymentService;
use App\Services\GiftCardService;
use App\Support\PaymentDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use RuntimeException;

class GiftCardController
{
    public function __construct(
        private GiftCardService $giftCardService,
        private GiftCardPaymentService $payments,
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
            'code' => 'nullable|string|max:100',
            'buyer_name' => 'nullable|string|max:255',
            'buyer_phone' => 'nullable|string|max:50',
            'recipient_name' => 'required|string|max:255',
            'recipient_phone' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
            'branch_id' => 'nullable|uuid',
            'payment' => 'nullable|array',
            ...$this->paymentRules('payment.'),
        ]);

        // Si se manda el cobro, todo se valida ANTES de crear nada: o se guardan la gift card y su cobro, o ninguna.
        $normalized = null;
        $paidAt = null;
        if (!empty($data['payment'])) {
            $prepared = $this->preparePayment($p->business_id, $p->role, $data['payment']);
            if ($prepared instanceof JsonResponse) {
                return $prepared;
            }
            [$normalized, $paidAt] = $prepared;
            try {
                $this->payments->assertCovers($normalized['total'], (float) $data['amount']);
            } catch (InvalidArgumentException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
        }

        $giftCard = DB::transaction(function () use ($data, $p, $user, $normalized, $paidAt) {
            $giftCard = $this->giftCardService->store($data, $p->business_id, $user->id);
            if ($normalized) {
                $this->payments->save($giftCard, $normalized, $paidAt, $user->id);
            }

            return $giftCard;
        });

        EntityChanged::dispatch($p->business_id, 'gift_card', 'created', $giftCard->id);
        return response()->json($giftCard->load('payment'), 201);
    }

    /**
     * Registra (o reemplaza) cómo se pagó una gift card ya creada — p. ej. las que se vendieron antes de que el sistema
     * guardara el pago. Es dinero recibido, no ingreso: entra al Cuadre del Día, no a Finanzas.
     */
    public function savePayment(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate($this->paymentRules(''));
        $giftCard = $this->giftCardService->findForBusiness($id, $p->business_id);

        $prepared = $this->preparePayment($p->business_id, $p->role, $data);
        if ($prepared instanceof JsonResponse) {
            return $prepared;
        }
        [$normalized, $paidAt] = $prepared;

        $this->payments->save($giftCard, $normalized, $paidAt, $user->id);
        EntityChanged::dispatch($p->business_id, 'gift_card', 'updated', $id);

        return response()->json($giftCard->fresh()->load('payment'));
    }

    /** Quita el cobro registrado (si se registró mal). La gift card no se toca. */
    public function removePayment(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $giftCard = $this->giftCardService->findForBusiness($id, $p->business_id);
        $this->payments->remove($giftCard);
        EntityChanged::dispatch($p->business_id, 'gift_card', 'updated', $id);

        return response()->json(null, 204);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'code' => 'nullable|string|max:100',
            'buyer_name' => 'nullable|string|max:255',
            'buyer_phone' => 'nullable|string|max:50',
            'recipient_name' => 'sometimes|string|max:255',
            'recipient_phone' => 'nullable|string|max:50',
            'amount' => 'sometimes|numeric|min:0.01',
            'status' => 'sometimes|in:active,redeemed,expired',
            'notes' => 'nullable|string',
        ]);

        $giftCard = $this->giftCardService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'gift_card', 'updated', $id);
        return response()->json($giftCard->load('payment'));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->giftCardService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'gift_card', 'deleted', $id);
        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function paymentRules(string $prefix): array
    {
        return [
            "{$prefix}lines" => ($prefix === '' ? 'required' : 'required_with:payment').'|array|min:1|max:6',
            "{$prefix}lines.*.method" => ['required', Rule::in(GiftCardPaymentService::METHODS)],
            "{$prefix}lines.*.input_amount" => 'required|numeric|min:0.01',
            "{$prefix}lines.*.bank_id" => 'nullable|uuid',
            "{$prefix}exchange_rate" => 'nullable|numeric|min:0',
            "{$prefix}paid_date" => 'nullable|date_format:Y-m-d',
        ];
    }

    /**
     * Valida el cobro y resuelve su fecha. Devuelve [datos normalizados, momento del cobro] o la respuesta de error.
     * La fecha sigue la misma regla que en el POS y los abonos de crédito (solo admin/encargado y con la opción activa).
     *
     * @param  array<string, mixed>  $payment
     * @return array{0: array{splits: list<array<string, mixed>>, total: float, rate: float|null}, 1: \Carbon\CarbonInterface}|JsonResponse
     */
    private function preparePayment(string $businessId, ?string $role, array $payment): array|JsonResponse
    {
        $denied = PaymentDate::denial($role, $businessId, $payment['paid_date'] ?? null);
        if ($denied) {
            return response()->json(['message' => $denied], 403);
        }

        try {
            $paidAt = PaymentDate::resolve($businessId, $payment['paid_date'] ?? null) ?? now();
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Sin tasa en la petición se usa la del negocio (solo hace falta con pagos en bolívares).
        $rate = isset($payment['exchange_rate']) && (float) $payment['exchange_rate'] > 0
            ? (float) $payment['exchange_rate']
            : (float) (Business::find($businessId)?->ves_exchange_rate ?: 0);

        try {
            $normalized = $this->payments->normalize($businessId, $payment['lines'], $rate ?: null);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return [$normalized, $paidAt];
    }
}
