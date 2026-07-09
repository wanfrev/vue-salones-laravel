<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait PaginatesResults
{
    protected function paginateQuery(Builder $query, Request $request, int $maxPerPage = 100)
    {
        $perPage = (int) $request->get('per_page', 0);

        if ($perPage > 0) {
            $perPage = min($perPage, $maxPerPage);
            $page = max(1, (int) $request->get('page', 1));
            $total = $query->count();
            $items = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

            return [
                'data' => $items,
                'meta' => [
                    'page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => (int) ceil($total / $perPage),
                ],
            ];
        }

        return $query->get();
    }
}
