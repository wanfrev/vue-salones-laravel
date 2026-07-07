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
        ];
    }
}
