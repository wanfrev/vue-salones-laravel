<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DirectSaleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'total_amount' => 'required|numeric|min:0',
            'method' => 'required|string|max:50',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|uuid',
            'products.*.variant_id' => 'nullable|uuid',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.unit_cost' => 'required|numeric|min:0',
            'products.*.name' => 'nullable|string',
            'products.*.location_id' => 'nullable|uuid',
            'notes' => 'nullable|string|max:500',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
            'payments_breakdown.*.method' => 'required|string',
            'payments_breakdown.*.inputAmount' => 'required|numeric|min:0',
            'payments_breakdown.*.currency' => 'required|in:USD,VES',
            'payments_breakdown.*.amount' => 'required|numeric|min:0',
            'client_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
