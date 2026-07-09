<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class BusinessScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (!app()->bound('biz_id')) return;
        $bid = app('biz_id');
        if (!$bid) return;
        $builder->where($model->getTable().'.business_id', $bid);
    }
}
