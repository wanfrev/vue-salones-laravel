<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'total_debt' => 'nullable|numeric|min:0',
            'debt_currency' => 'nullable|in:USD,VES',
            'debt_original_amount' => 'nullable|numeric|min:0',
            'debt_exchange_rate' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
