<?php

namespace App\Http\Requests;

use App\Support\NicheRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'ownerEmail' => ['required', 'email'],
            'ownerPassword' => ['required', 'string', 'min:6'],
            // Strict on create — new businesses can only be minted on a registered niche.
            // (Editing an existing business is more permissive; see AssignableNiche.)
            'nicheType' => ['nullable', 'string', 'max:50', Rule::in(NicheRegistry::creatableIds())],
            'linkedUserId' => ['nullable', 'uuid', 'exists:users,id'],
        ];
    }
}
