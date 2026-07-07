<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductCategory extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'product_categories';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'parent_id',
        'name', 'description', 'active', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'metadata' => 'json',
        ];
    }
}
