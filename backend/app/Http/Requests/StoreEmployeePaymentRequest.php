<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|in:USD,VES',
            'payment_method' => 'required|string|max:50',
            'type' => 'required|in:payment,consumption',
            'concept' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
            'payment_date' => 'required|date',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'original_amount' => 'nullable|numeric|min:0',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
