<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\ProcessSaleRequest;
use App\Http\Requests\DirectSaleRequest;
use App\Http\Requests\DirectServiceSaleRequest;
use App\Services\PosService;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosController
{
    public function __construct(
        private PosService $posService,
        private ProductService $productService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    /**
     * "Cobrar con otra fecha" mueve dinero entre días en los reportes, así que se exige en el
     * servidor (no solo ocultando el campo): el negocio tiene que haberlo activado en
     * Configuración y quien cobra debe ser admin o encargado. Devuelve la respuesta de rechazo,
     * o null si se puede continuar (incluido el caso normal de no mandar fecha).
     */
    private function backdateDenied(Request $request, ?string $businessId, ?string $paidDate): ?JsonResponse
    {
        $message = \App\Support\PaymentDate::denial($request->user()?->profile?->role, $businessId, $paidDate);

        return $message ? response()->json(['message' => $message], 403) : null;
    }

    public function pendingAppointments(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->posService->getPendingAppointments($businessId, $request->get('branch_id'))
        );
    }

    public function saleableProducts(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->posService->getSaleableProducts($businessId, $request->get('branch_id'))
        );
    }

    public function frequentlyBoughtTogether(Request $request, string $productId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->productService->frequentlyBoughtWith($businessId, $productId, $request->get('branch_id'))
        );
    }

    public function recordSale(ProcessSaleRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validated();

        if ($denied = $this->backdateDenied($request, $businessId, $data['paid_date'] ?? null)) {
            return $denied;
        }

        try {
            $txId = $this->posService->processSale(
                appointmentId: $data['appointment_id'],
                serviceAmount: (float) $data['service_amount'],
                method: $data['method'],
                products: $data['products'] ?? [],
                notes: $data['notes'] ?? null,
                exchangeRate: $data['exchange_rate_used'] ?? null,
                paymentsBreakdown: $data['payments_breakdown'] ?? [],
                tipAmount: $data['tip_amount'] ?? null,
                tipCurrency: $data['tip_currency'] ?? null,
                businessId: $businessId,
                createdBy: $request->user()->id,
                productsAmount: (float) ($data['products_amount'] ?? 0),
                paidDate: $data['paid_date'] ?? null,
            );

            EntityChanged::safe($businessId, 'transaction', 'created', $txId);
            $tx = \App\Models\Transaction::find($txId);

            return response()->json(['id' => $txId, 'receipt_code' => $tx ? $tx->receipt_code : null], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function directSale(DirectSaleRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validated();

        if ($denied = $this->backdateDenied($request, $businessId, $data['paid_date'] ?? null)) {
            return $denied;
        }

        try {
            $txId = $this->posService->processDirectSale(
                totalAmount: (float) $data['total_amount'],
                method: $data['method'],
                products: $data['products'],
                notes: $data['notes'] ?? null,
                exchangeRate: $data['exchange_rate_used'] ?? null,
                paymentsBreakdown: $data['payments_breakdown'] ?? [],
                clientId: $data['client_id'] ?? null,
                clientNameInput: $data['client_name'] ?? null,
                clientPhoneInput: $data['client_phone'] ?? null,
                businessId: $businessId,
                branchId: $data['branch_id'] ?? null,
                createdBy: $request->user()->id,
                paidDate: $data['paid_date'] ?? null,
            );

            EntityChanged::safe($businessId, 'transaction', 'created', $txId);
            $tx = \App\Models\Transaction::find($txId);

            return response()->json(['id' => $txId, 'receipt_code' => $tx ? $tx->receipt_code : null], 201);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('DirectSale error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function directServiceSale(DirectServiceSaleRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validated();

        if ($denied = $this->backdateDenied($request, $businessId, $data['paid_date'] ?? null)) {
            return $denied;
        }

        try {
            $txId = $this->posService->processDirectServiceSale(
                serviceId: $data['service_id'] ?? null,
                employeeId: $data['employee_id'] ?? null,
                assistantEmployeeId: $data['assistant_employee_id'] ?? null,
                clientId: $data['client_id'] ?? null,
                serviceAmount: (float) ($data['service_amount'] ?? 0),
                method: $data['method'],
                products: $data['products'] ?? [],
                notes: $data['notes'] ?? null,
                exchangeRate: $data['exchange_rate_used'] ?? null,
                paymentsBreakdown: $data['payments_breakdown'] ?? [],
                tipAmount: $data['tip_amount'] ?? null,
                tipCurrency: $data['tip_currency'] ?? null,
                businessId: $businessId,
                branchId: $data['branch_id'] ?? null,
                createdBy: $request->user()->id,
                productsAmount: (float) ($data['products_amount'] ?? 0),
                services: $data['services'] ?? [],
                paidDate: $data['paid_date'] ?? null,
            );

            EntityChanged::safe($businessId, 'transaction', 'created', $txId);
            $tx = \App\Models\Transaction::find($txId);

            return response()->json(['id' => $txId, 'receipt_code' => $tx ? $tx->receipt_code : null], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function standaloneTip(\App\Http\Requests\StandaloneTipRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'Sin negocio asignado.'], 403);

        $data = $request->validated();

        $employeeBelongsToBusiness = \App\Models\Profile::where('id', $data['employee_id'])
            ->where('business_id', $businessId)
            ->exists();
        if (!$employeeBelongsToBusiness) {
            return response()->json(['message' => 'Empleado no encontrado.'], 404);
        }

        if ($denied = $this->backdateDenied($request, $businessId, $data['paid_date'] ?? null)) {
            return $denied;
        }

        try {
            $txId = $this->posService->recordStandaloneTip(
                businessId: $businessId,
                branchId: $data['branch_id'] ?? null,
                employeeId: $data['employee_id'],
                tipAmount: (float) $data['tip_amount'],
                tipCurrency: $data['tip_currency'] ?? null,
                method: $data['method'],
                paymentsBreakdown: $data['payments_breakdown'] ?? [],
                exchangeRate: $data['exchange_rate_used'] ?? null,
                notes: $data['notes'] ?? null,
                createdBy: $request->user()->id,
                paidDate: $data['paid_date'] ?? null,
            );

            EntityChanged::safe($businessId, 'transaction', 'created', $txId);

            return response()->json(['id' => $txId], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
