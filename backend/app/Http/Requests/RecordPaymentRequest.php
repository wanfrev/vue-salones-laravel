<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecordPaymentRequest extends FormRequest
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
            'payments_breakdown.*.method' => 'required|string',
            'payments_breakdown.*.amount' => 'required|numeric|min:0',
            'payments_breakdown.*.currency' => 'required|in:USD,VES',
            'payments_breakdown.*.inputAmount' => 'nullable|numeric|min:0',
        ];
    }
}
