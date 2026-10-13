<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class StaffingSignature extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_signatures';

    protected $fillable = ['id', 'business_id', 'profile_id', 'image'];

    /** Same "safe to deploy before the migration" guard as StaffingTimesheet::stampColumnsExist(). */
    public static function tableExists(): bool
    {
        static $exists = null;

        return $exists ??= Schema::hasTable('staffing_signatures');
    }
}
