<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Http\Request;

trait ResolvesBusinessId
{
    protected function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }

        $fromHeader = $request->header('X-Business-Id');
        if ($fromHeader) {
            return $fromHeader;
        }

        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }

        return $raw ?: null;
    }
}
