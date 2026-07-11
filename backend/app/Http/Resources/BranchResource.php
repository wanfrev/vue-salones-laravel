<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BranchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'name' => $this->name,
            'address' => $this->address,
            'phone' => $this->phone,
            'is_default' => $this->is_default,
            'active' => $this->active,
            'ves_exchange_rate' => $this->ves_exchange_rate,
            'service_categories' => array_values(array_unique(array_map(
                fn($cat) => is_string($cat) ? $cat : ($cat['name'] ?? ''),
                $this->service_categories ?? []
            ))),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
