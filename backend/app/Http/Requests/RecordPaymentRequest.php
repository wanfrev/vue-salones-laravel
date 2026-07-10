<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecordPaymentRequest extends FormRequest
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
            'payments_breakdown.*.method' => 'required|string',
            'payments_breakdown.*.amount' => 'required|numeric|min:0',
            'payments_breakdown.*.currency' => 'required|in:USD,VES',
            'payments_breakdown.*.inputAmount' => 'nullable|numeric|min:0',
            'tip_amount' => 'nullable|numeric|min:0',
        ];
    }
}
