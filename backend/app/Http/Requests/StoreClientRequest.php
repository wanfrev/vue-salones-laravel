<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
            'birthday' => 'nullable|date',
            'branch_id' => 'nullable|uuid',
            'metadata' => 'nullable|array',
        ];
    }
}
