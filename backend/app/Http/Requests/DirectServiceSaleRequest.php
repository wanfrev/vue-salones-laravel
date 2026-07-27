<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DirectServiceSaleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'service_id' => 'required|uuid',
            'employee_id' => 'required|uuid',
            'assistant_employee_id' => 'nullable|uuid',
            'client_id' => 'nullable|uuid',
            'service_amount' => 'required|numeric|min:0',
            'method' => 'required|string|max:50',
            'products' => 'nullable|array',
            'products.*.product_id' => 'required_with:products|uuid',
            'products.*.variant_id' => 'nullable|uuid',
            'products.*.quantity' => 'required_with:products|integer|min:1',
            'products.*.unit_cost' => 'nullable|numeric|min:0',
            'products.*.name' => 'nullable|string',
            'products.*.location_id' => 'nullable|uuid',
            'notes' => 'nullable|string|max:500',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
            'payments_breakdown.*.method' => 'required|string',
            'payments_breakdown.*.inputAmount' => 'required|numeric|min:0',
            'payments_breakdown.*.currency' => 'required|in:USD,VES',
            'payments_breakdown.*.amount' => 'required|numeric|min:0',
            'payments_breakdown.*.gift_card_id' => 'nullable|string',
            'payments_breakdown.*.giftCardId' => 'nullable|string',
            'tip_amount' => 'nullable|numeric|min:0',
            'products_amount' => 'nullable|numeric|min:0',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
