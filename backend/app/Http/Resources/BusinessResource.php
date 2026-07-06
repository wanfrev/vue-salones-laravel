<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BusinessResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'phone' => $this->phone,
            'address' => $this->address,
            'timezone' => $this->timezone,
            'currency' => $this->currency,
            'ves_exchange_rate' => $this->ves_exchange_rate,
            'employee_ves_rate' => $this->employee_ves_rate,
            'niche_type' => $this->niche_type,
            'theme_config' => $this->theme_config,
            'terminology' => $this->terminology,
            'job_titles' => $this->job_titles,
            'service_categories' => $this->service_categories,
            'features' => $this->features,
            'multi_branch_enabled' => $this->multi_branch_enabled,
            'active' => $this->active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
