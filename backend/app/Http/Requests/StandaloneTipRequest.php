<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StandaloneTipRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'employee_id' => 'required|uuid',
            'tip_amount' => 'required|numeric|min:0.01',
            'tip_currency' => 'nullable|in:USD,VES',
            'method' => 'required|string|max:50',
            'notes' => 'nullable|string|max:500',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
            'payments_breakdown.*.method' => 'required|string',
            'payments_breakdown.*.inputAmount' => 'required|numeric|min:0',
            'payments_breakdown.*.currency' => 'required|in:USD,VES',
            'payments_breakdown.*.amount' => 'required|numeric|min:0',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
