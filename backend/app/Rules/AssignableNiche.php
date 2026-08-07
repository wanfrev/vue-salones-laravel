<?php

namespace App\Rules;

use App\Models\Business;
use App\Support\NicheRegistry;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Passes if the value is a registered creatable niche, OR if it matches the target
 * business's CURRENT niche_type unchanged. Lets a business already on an unregistered/
 * free-text niche (e.g. the legacy 'Negocios' string) keep being edited without being
 * forced onto — or blocked from being moved to — a real niche, while still blocking the
 * creation of NEW free-text niches through this endpoint. See CreateBusinessRequest for
 * the strict counterpart used on creation.
 */
class AssignableNiche implements ValidationRule
{
    public function __construct(private readonly string $businessId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (in_array($value, NicheRegistry::creatableIds(), true)) {
            return;
        }

        $current = Business::find($this->businessId)?->niche_type;

        if ($value === $current) {
            return;
        }

        $fail('El nicho debe ser uno de los registrados.');
    }
}
