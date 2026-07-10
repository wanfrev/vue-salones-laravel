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
            if (in_array($key, ['select', 'order', 'limit', 'offset', 'per_page', 'page'])) {
                continue;
            }

            // Handle PostgREST "or" parameter: extract employee_id filters
            if ($key === 'or' && is_string($value)) {
                foreach (explode(',', $value) as $condition) {
                    if (preg_match('/^employee_id\.eq\.(.+)$/', trim($condition), $m)) {
                        $parsed['employee_id'] = $m[1];
                    }
                }
                continue;
            }

            if (is_string($value) && str_contains($value, '.')) {
                $parts = explode('.', $value, 2);
                $op = $parts[0];
                $val = $parts[1] ?? '';

                if ($op === 'eq') {
                    $parsed[$key] = $val === 'null' ? null : $val;
                } elseif ($op === 'neq') {
                    $parsed["{$key}_not"] = $val === 'null' ? null : $val;
                } elseif ($op === 'in') {
                    $val = trim($val, '()');
                    $parsed[$key] = $val === '' ? [] : explode(',', $val);
                } elseif ($op === 'gt') {
                    $parsed[$key] = $val;
                } elseif ($op === 'gte') {
                    $parsed[$key] = $val;
                } elseif ($op === 'lt') {
                    $parsed[$key] = $val;
                } elseif ($op === 'lte') {
                    $parsed[$key] = $val;
                } elseif ($op === 'like' || $op === 'ilike') {
                    $parsed[$key] = str_replace('*', '%', $val);
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
