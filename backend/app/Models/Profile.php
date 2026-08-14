<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToBusiness;

class Profile extends Model
{
    use BelongsToBusiness;
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'full_name', 'role', 'phone', 'avatar_url',
        'active', 'email', 'job_title',
        'pay_type', 'pay_percentage', 'base_salary', 'salary_frequency',
        'employee_ves_rate',
        'disable_agenda', 'disable_inventory_edit',
        'can_create_appointments', 'can_create_clients',
        'can_access_consultorio',
        'can_access_inventory', 'can_access_pos', 'can_access_suppliers', 'can_access_finanzas', 'can_access_requirements',
        'staffing_company_id', 'staffing_role', 'staffing_tax_rate', 'ssn', 'address',
        'bank_name', 'bank_account_holder', 'bank_account_type', 'payment_method',
        'bank_routing_number', 'bank_account_number', 'payroll_card_number',
    ];

    // Never serialized in full — see the *Last4 accessors below for what the API exposes instead.
    protected $hidden = [
        'bank_routing_number', 'bank_account_number', 'payroll_card_number', 'ssn',
    ];

    protected $appends = [
        'bank_account_last4', 'payroll_card_last4', 'ssn_last4',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'disable_agenda' => 'boolean',
            'disable_inventory_edit' => 'boolean',
            'can_create_appointments' => 'boolean',
            'can_create_clients' => 'boolean',
            'can_access_consultorio' => 'boolean',
            'can_access_inventory' => 'boolean',
            'can_access_pos' => 'boolean',
            'can_access_suppliers' => 'boolean',
            'can_access_finanzas' => 'boolean',
            'can_access_requirements' => 'boolean',
            'pay_percentage' => 'float',
            'base_salary' => 'float',
            'employee_ves_rate' => 'float',
            'staffing_tax_rate' => 'float',
            'bank_routing_number' => 'encrypted',
            'bank_account_number' => 'encrypted',
            'payroll_card_number' => 'encrypted',
            'ssn' => 'encrypted',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(EmployeeSchedule::class, 'employee_id');
    }

    public function staffingCompany(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'staffing_company_id');
    }

    /**
     * Last 4 digits only — the full number is in $hidden and never leaves the server. Swallows
     * decryption failures instead of 500ing a list endpoint over one corrupted/legacy row.
     */
    protected function getBankAccountLast4Attribute(): ?string
    {
        return $this->last4Of('bank_account_number');
    }

    protected function getPayrollCardLast4Attribute(): ?string
    {
        return $this->last4Of('payroll_card_number');
    }

    protected function getSsnLast4Attribute(): ?string
    {
        return $this->last4Of('ssn');
    }

    private function last4Of(string $attribute): ?string
    {
        try {
            $value = $this->{$attribute};
        } catch (\Throwable) {
            return null;
        }

        if (!$value) {
            return null;
        }

        return substr($value, -4);
    }
}
