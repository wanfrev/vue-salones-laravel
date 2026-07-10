<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecordSaleRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'appointment_id' => $this->input('appointment_id', $this->input('p_appointment_id')),
            'amount' => $this->input('amount', $this->input('p_amount')),
            'method' => $this->input('method', $this->input('p_method')),
            'notes' => $this->input('notes', $this->input('p_notes')),
            'exchange_rate_used' => $this->input('exchange_rate_used', $this->input('p_exchange_rate')),
            'payments_breakdown' => $this->input('payments_breakdown', $this->input('p_payments_breakdown')),
            'products' => $this->input('products', $this->input('p_products')),
            'tip_amount' => $this->input('tip_amount', $this->input('p_tip_amount')),
        ]);
    }

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
            'tip_amount' => 'nullable|numeric|min:0',
        ];
    }
}
