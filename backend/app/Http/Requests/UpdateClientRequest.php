<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:50',
            'email' => 'nullable|email|max:255',
            'client_code' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'birthday' => 'nullable|date',
            'branch_id' => 'nullable|uuid',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'second_last_name' => 'nullable|string|max:255',
            'document_id' => 'nullable|string|max:50',
            'medical_insurance' => 'nullable|string|max:255',
            'emergency_phone' => 'nullable|string|max:50',
            'metadata' => 'nullable|array',
            'pets' => 'nullable|array',
            'pets.*.id' => 'nullable|uuid',
            'pets.*.name' => 'required_with:pets|string|max:255',
            'pets.*.breed' => 'nullable|string|max:255',
            'pets.*.weight' => 'nullable|string|max:50',
            'pets.*.birthday' => 'nullable|date',
            'pets.*.notes' => 'nullable|string',
            'pets.*.metadata' => 'nullable|array',
            'pets.*._delete' => 'nullable|boolean',
        ];
    }
}
