<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\EmployeeSchedule;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProfileController
{
    /**
     * GET /api/profiles — List employees for current business.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $query = Profile::with('schedules')
            ->where('business_id', $p->business_id)
            ->where('role', 'empleado')
            ->where('active', true)
            ->orderBy('full_name');

        // Filter by branch: employees whose schedules include that branch
        if ($request->branch_id) {
            $query->whereHas('schedules', fn($q) =>
                $q->where('branch_id', $request->branch_id)
            );
        }

        return response()->json($query->get());
    }

    /**
     * POST /api/profiles — Create employee (user + profile + schedules).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:50',
            'job_title' => 'nullable|string|max:100',
            'pay_type' => 'required|in:salary,percentage,mixed',
            'pay_percentage' => 'nullable|numeric|min:0|max:100',
            'base_salary' => 'nullable|numeric|min:0',
            'salary_frequency' => 'nullable|in:weekly,biweekly,monthly',
            'disable_agenda' => 'boolean',
            'schedules' => 'nullable|array',
            'schedules.*.branch_id' => 'nullable|uuid',
            'schedules.*.weekday' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ]);

        $userId = Str::uuid()->toString();

        DB::beginTransaction();
        try {
            User::create([
                'id' => $userId,
                'name' => $data['full_name'],
                'email' => strtolower($data['email']),
                'password' => bcrypt($data['password']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Profile::create([
                'id' => $userId,
                'business_id' => $p->business_id,
                'full_name' => $data['full_name'],
                'role' => 'empleado',
                'phone' => $data['phone'] ?? null,
                'email' => strtolower($data['email']),
                'job_title' => $data['job_title'] ?? null,
                'pay_type' => $data['pay_type'],
                'pay_percentage' => $data['pay_percentage'] ?? 50,
                'base_salary' => $data['base_salary'] ?? 0,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (!empty($data['schedules'])) {
                foreach ($data['schedules'] as $s) {
                    EmployeeSchedule::create([
                        'id' => Str::uuid()->toString(),
                        'employee_id' => $userId,
                        'branch_id' => $s['branch_id'] ?? null,
                        'weekday' => $s['weekday'],
                        'start_time' => $s['start_time'],
                        'end_time' => $s['end_time'],
                        'created_at' => now(),
                    ]);
                }
            }

            DB::commit();
            EntityChanged::dispatch($p->business_id, 'profile', 'created', $userId);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => ['message' => 'Error al crear empleado.']], 500);
        }

        return response()->json(Profile::with('schedules')->find($userId), 201);
    }

    /**
     * PUT /api/profiles/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $profile = Profile::find($id);
        if (!$profile || $profile->business_id !== $p?->business_id) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $data = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'phone' => 'nullable|string|max:50',
            'job_title' => 'nullable|string|max:100',
            'pay_type' => 'sometimes|in:salary,percentage,mixed',
            'pay_percentage' => 'nullable|numeric|min:0|max:100',
            'base_salary' => 'nullable|numeric|min:0',
            'salary_frequency' => 'nullable|in:weekly,biweekly,monthly',
            'disable_agenda' => 'boolean',
            'active' => 'boolean',
            'schedules' => 'nullable|array',
            'schedules.*.branch_id' => 'nullable|uuid',
            'schedules.*.weekday' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ]);

        // Update user email/password if provided
        $updates = array_filter([
            'name' => $data['full_name'] ?? null,
            'email' => isset($data['email']) ? strtolower($data['email']) : null,
        ]);
        if (!empty($updates)) {
            User::where('id', $id)->update($updates);
        }
        if (!empty($data['password'])) {
            User::where('id', $id)->update(['password' => bcrypt($data['password'])]);
        }

        // Update profile
        $profileFields = array_filter([
            'full_name' => $data['full_name'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => isset($data['email']) ? strtolower($data['email']) : null,
            'job_title' => $data['job_title'] ?? null,
            'pay_type' => $data['pay_type'] ?? null,
            'pay_percentage' => $data['pay_percentage'] ?? null,
            'base_salary' => $data['base_salary'] ?? null,
        ]) + ['updated_at' => now()];

        if (array_key_exists('disable_agenda', $data)) $profileFields['disable_agenda'] = $data['disable_agenda'];
        if (array_key_exists('active', $data)) $profileFields['active'] = $data['active'];

        $profile->update($profileFields);

        // Replace schedules if provided
        if (array_key_exists('schedules', $data)) {
            EmployeeSchedule::where('employee_id', $id)->delete();
            foreach (($data['schedules'] ?? []) as $s) {
                EmployeeSchedule::create([
                    'id' => Str::uuid()->toString(),
                    'employee_id' => $id,
                    'branch_id' => $s['branch_id'] ?? null,
                    'weekday' => $s['weekday'],
                    'start_time' => $s['start_time'],
                    'end_time' => $s['end_time'],
                    'created_at' => now(),
                ]);
            }
        }

        return response()->json(Profile::with('schedules')->find($id));
        EntityChanged::dispatch($p->business_id, 'profile', 'updated', $id);
    }

    /**
     * DELETE /api/profiles/{id} — Soft delete
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $profile = Profile::find($id);
        if (!$profile || $profile->business_id !== $p?->business_id) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $profile->update(['active' => false, 'updated_at' => now()]);
        User::where('id', $id)->update(['updated_at' => now()]);

        EntityChanged::dispatch($p->business_id, 'profile', 'deleted', $id);

        return response()->json(null, 204);
    }
}
