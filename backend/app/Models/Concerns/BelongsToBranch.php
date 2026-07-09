<?php

namespace App\Models\Concerns;

use App\Scopes\BranchScope;

trait BelongsToBranch
{
    protected static function bootBelongsToBranch(): void
    {
        // Global scope desactivado temporalmente — usar filtros manuales en services.
        // static::addGlobalScope(new BranchScope);
    }
}
