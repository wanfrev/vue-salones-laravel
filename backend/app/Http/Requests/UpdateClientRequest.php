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
            'notes' => 'nullable|string',
            'birthday' => 'nullable|date',
            'branch_id' => 'nullable|uuid',
            'metadata' => 'nullable|array',
            'pets' => 'nullable|array',
            'pets.*.id' => 'nullable|uuid',
            'pets.*.name' => 'required_with:pets|string|max:255',
            'pets.*.breed' => 'nullable|string|max:255',
            'pets.*.weight' => 'nullable|string|max:50',
            'pets.*.notes' => 'nullable|string',
            'pets.*.metadata' => 'nullable|array',
            'pets.*._delete' => 'nullable|boolean',
        ];
    }
}
