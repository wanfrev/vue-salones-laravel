<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateBusinessRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'ownerEmail' => ['required', 'email'],
            'ownerPassword' => ['required', 'string', 'min:6'],
            'nicheType' => ['nullable', 'string', 'max:50'],
        ];
    }
}
