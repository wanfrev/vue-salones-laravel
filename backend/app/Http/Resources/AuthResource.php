<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $profile = $this->profile;

        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => $profile?->role,
            'profile' => $profile ? [
                'id' => $profile->id,
                'business_id' => $profile->business_id,
                'full_name' => $profile->full_name,
                'role' => $profile->role,
                'phone' => $profile->phone,
                'avatar_url' => $profile->avatar_url,
                'active' => $profile->active,
                'pay_type' => $profile->pay_type,
                'pay_percentage' => $profile->pay_percentage,
                'base_salary' => $profile->base_salary,
            ] : null,
        ];
    }
}
