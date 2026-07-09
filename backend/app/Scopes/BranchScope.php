<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class BranchScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (!app()->bound('branch_id')) return;
        $bid = app('branch_id');
        if (!$bid) return;
        $t = $model->getTable();
        $builder->where(fn(Builder $q) => $q->whereNull("$t.branch_id")->orWhere("$t.branch_id", $bid));
    }
}
