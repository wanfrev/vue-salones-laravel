<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProcessSaleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'appointment_id' => 'required|uuid',
            'service_amount' => 'required|numeric|min:0',
            'method' => 'required|string|max:50',
            'products' => 'nullable|array',
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
            'tip_amount' => 'nullable|numeric|min:0',
        ];
    }
}
