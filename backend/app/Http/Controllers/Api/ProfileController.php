<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\BusinessContext;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController
{
    public function __construct(
        private ProfileService $profileService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    /**
     * Staffing workers have no login at all — the form never asks for email/password, so those
     * fields must not be required. Every other niche keeps today's behaviour unchanged.
     */
    private function isStaffingBusiness(): bool
    {
        if (!app()->bound(BusinessContext::class)) {
            return false;
        }

        return app(BusinessContext::class)->hasCapability('staffing.timesheets');
    }

    /**
     * @return array<string, mixed>
     */
    private function staffingFieldRules(): array
    {
        return [
            // A staffing worker can be assigned to more than one client company at once, each
            // with its own role (rates are per company+role) — see StaffingCompanyEmployeeService.
            'staffing_assignments' => 'nullable|array',
            'staffing_assignments.*.company_id' => 'required_with:staffing_assignments|uuid|exists:staffing_companies,id',
            'staffing_assignments.*.project_id' => 'nullable|uuid|exists:staffing_projects,id',
            'staffing_assignments.*.role' => 'required_with:staffing_assignments|string|max:120',
            // Only meaningful for companies whose rate card splits a role's pay by shift — most
            // assignments leave this null.
            'staffing_assignments.*.shift' => 'nullable|in:dia,tarde,noche',
            // Fraction (0.07 = 7%) overriding the company's tax_brackets for this employee only.
            'staffing_tax_rate' => 'nullable|numeric|min:0|max:1',
            'ssn' => 'nullable|string|max:11',
            'address' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_holder' => 'nullable|string|max:255',
            'bank_account_type' => 'nullable|in:checking,savings',
            'payment_method' => 'nullable|in:direct_deposit,payroll_card',
            'bank_routing_number' => 'nullable|string|max:34',
            'bank_account_number' => 'nullable|string|max:34',
            'payroll_card_number' => 'nullable|string|max:34',
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        return response()->json(
            $this->profileService->list($businessId, $request->branch_id, $request->disable_agenda, $request->active)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $isStaffing = $this->isStaffingBusiness();

        $data = $request->validate(array_merge([
            'full_name' => 'required|string|max:255',
            'email' => ($isStaffing ? 'nullable' : 'required') . '|email|unique:users,email',
            'password' => ($isStaffing ? 'nullable' : 'required') . '|string|min:6',
            'phone' => 'nullable|string|max:50',
            'job_title' => 'nullable|string|max:100',
            'role' => 'nullable|in:empleado,encargado',
            'pay_type' => ($isStaffing ? 'nullable' : 'required') . '|in:salary,percentage,mixed',
            'pay_percentage' => 'nullable|numeric|min:0|max:100',
            'base_salary' => 'nullable|numeric|min:0',
            'salary_frequency' => 'nullable|in:weekly,biweekly,monthly',
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
            'branch_id' => 'nullable|uuid',
            'schedules' => 'nullable|array',
            'schedules.*.branch_id' => 'nullable|uuid',
            'schedules.*.weekday' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ], $this->staffingFieldRules()));

        try {
            $profile = $this->profileService->store($data, $businessId);
            EntityChanged::safe($businessId, 'profile', 'created', $profile->id);
            return response()->json($profile, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate(array_merge([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'phone' => 'nullable|string|max:50',
            'job_title' => 'nullable|string|max:100',
            'role' => 'nullable|in:empleado,encargado',
            'pay_type' => 'sometimes|in:salary,percentage,mixed',
            'pay_percentage' => 'nullable|numeric|min:0|max:100',
            'base_salary' => 'nullable|numeric|min:0',
            'salary_frequency' => 'nullable|in:weekly,biweekly,monthly',
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
            'active' => 'boolean',
            'branch_id' => 'nullable|uuid',
            'schedules' => 'nullable|array',
            'schedules.*.branch_id' => 'nullable|uuid',
            'schedules.*.weekday' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ], $this->staffingFieldRules()));

        $profile = $this->profileService->update($id, $data, $businessId);
        EntityChanged::safe($businessId, 'profile', 'updated', $id);
        return response()->json($profile);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $profile = $this->profileService->findForBusiness($id, $this->resolveBusinessId($request) ?? '');
        return response()->json($profile);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $this->profileService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'profile', 'deleted', $id);
        return response()->json(null, 204);
    }
}
