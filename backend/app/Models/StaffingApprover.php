<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class StaffingApprover extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_approvers';

    protected $fillable = ['id', 'business_id', 'name', 'pin_hash', 'image', 'active'];

    /** The hash never leaves the server. */
    protected $hidden = ['pin_hash'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    /** Safe to deploy before the migration — same guard as StaffingTimesheet::stampColumnsExist(). */
    public static function tableExists(): bool
    {
        static $exists = null;

        return $exists ??= Schema::hasTable('staffing_approvers');
    }
}
