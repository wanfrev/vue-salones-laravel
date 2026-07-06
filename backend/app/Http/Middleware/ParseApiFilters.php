<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Parses PostgREST-style query parameters from the frontend API client.
 * Converts ?column=eq.value → request()->merge(['column' => 'value'])
 */
class ParseApiFilters
{
    public function handle(Request $request, Closure $next)
    {
        $parsed = [];

        foreach ($request->query() as $key => $value) {
            // Skip special params
            if (in_array($key, ['select', 'order', 'limit', 'or'])) {
                continue;
            }

            if (is_string($value) && str_contains($value, '.')) {
                $parts = explode('.', $value, 2);
                $op = $parts[0];
                $val = $parts[1] ?? '';

                if ($op === 'eq') {
                    $parsed[$key] = $val === 'null' ? null : $val;
                } elseif ($op === 'in') {
                    // in.(val1,val2) format
                    $val = trim($val, '()');
                    $parsed[$key] = $val === '' ? [] : explode(',', $val);
                }
            } else {
                $parsed[$key] = $value;
            }
        }

        if (!empty($parsed)) {
            $request->merge($parsed);
        }

        return $next($request);
    }
}
