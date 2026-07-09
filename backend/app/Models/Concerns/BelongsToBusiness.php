<?php

namespace App\Models\Concerns;

use App\Scopes\BusinessScope;

trait BelongsToBusiness
{
    protected static function bootBelongsToBusiness(): void
    {
        // Global scope desactivado temporalmente — usar filtros manuales en services.
        // static::addGlobalScope(new BusinessScope);
    }
}
