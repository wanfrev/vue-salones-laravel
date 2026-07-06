<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Unwraps { data: { ... } } body envelope sent by the frontend API client.
 * The Vue API client wraps all write payloads as { data: { key: value } }
 * for supabase-js compatibility.
 */
class UnwrapApiData
{
    public function handle(Request $request, Closure $next)
    {
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $body = $request->all();

            // If the body has a single 'data' key containing an array, unwrap it
            if (count($body) === 1 && array_key_exists('data', $body) && is_array($body['data'])) {
                $request->replace($body['data']);
            }
        }

        return $next($request);
    }
}
