<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => 'required|uuid',
            'pet_id' => 'nullable|uuid|exists:pets,id',
            'employee_id' => 'required|uuid',
            'service_id' => 'required|uuid',
            'assistant_employee_id' => 'nullable|uuid',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'status' => 'nullable|in:pending,confirmed,in_progress,completed,cancelled,no_show',
            'service_notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'source' => 'nullable|string',
            'group_id' => 'nullable|uuid',
            'price_override' => 'nullable|numeric|min:0',
            'employee_percentage_override' => 'nullable|numeric|min:0|max:100',
            'assistant_percentage' => 'nullable|numeric|min:0|max:100',
            'duration_override' => 'nullable|integer|min:1',
            'diagnosis' => 'nullable|string',
            'treatment' => 'nullable|string',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
