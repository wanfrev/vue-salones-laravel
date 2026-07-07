<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'currency' => 'required|in:USD,VES',
            'original_amount' => 'nullable|numeric|min:0',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
