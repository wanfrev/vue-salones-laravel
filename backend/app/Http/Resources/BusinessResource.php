<?php

namespace App\Http\Resources;

use App\Support\NicheRegistry;
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
            'product_price1_markup' => $this->product_price1_markup,
            'product_price2_markup' => $this->product_price2_markup,
            'niche_type' => $this->niche_type,
            'theme_config' => $this->theme_config,
            'terminology' => $this->terminology,
            'job_titles' => $this->job_titles,
            'service_categories' => array_values(array_unique(array_map(
                fn($cat) => is_string($cat) ? $cat : ($cat['name'] ?? ''),
                $this->service_categories ?? []
            ))),
            'features' => $this->features,
            'resolved_features' => NicheRegistry::resolveFeatures($this->niche_type, $this->features),
            'multi_branch_enabled' => $this->multi_branch_enabled,
            'active' => $this->active,
            'deleted_at' => $this->deleted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
