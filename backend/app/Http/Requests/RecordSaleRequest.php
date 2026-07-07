<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecordSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'appointment_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0',
            'method' => 'required|string|max:50',
            'notes' => 'nullable|string',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
            'products' => 'nullable|array',
            'products.*.product_id' => 'required|uuid',
            'products.*.quantity' => 'required|numeric|min:0.01',
            'products.*.unit_cost' => 'nullable|numeric|min:0',
            'products.*.variant_id' => 'nullable|uuid',
            'products.*.location_id' => 'nullable|uuid',
        ];
    }
}
