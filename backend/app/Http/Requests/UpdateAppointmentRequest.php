<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => 'sometimes|uuid',
            'pet_id' => 'nullable|uuid|exists:pets,id',
            'employee_id' => 'sometimes|uuid',
            'service_id' => 'sometimes|uuid',
            'assistant_employee_id' => 'nullable|uuid',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'service_notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'price_override' => 'nullable|numeric|min:0',
            'employee_percentage_override' => 'nullable|numeric|min:0|max:100',
            'assistant_percentage' => 'nullable|numeric|min:0|max:100',
            'duration_override' => 'nullable|integer|min:1',
            'group_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
