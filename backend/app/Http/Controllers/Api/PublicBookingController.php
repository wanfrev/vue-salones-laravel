<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Business;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PublicBookingController extends Controller
{
    private function findActiveBusiness(string $slug): ?Business
    {
        return Business::where('slug', $slug)->where('active', true)->first();
    }

    private function isPublicBookingEnabled(Business $business): bool
    {
        $features = is_array($business->features) ? $business->features : json_decode($business->features ?? '[]', true);
        return (bool) ($features['enable_public_booking'] ?? true);
    }

    public function business(string $slug): JsonResponse
    {
        $business = $this->findActiveBusiness($slug);
        if (!$business) return response()->json(['message' => 'Negocio no encontrado'], 404);

        return response()->json([
            'id' => $business->id,
            'name' => $business->name, 'timezone' => $business->timezone,
            'currency' => $business->currency, 'niche_type' => $business->niche_type,
            'theme_config' => $business->theme_config, 'terminology' => $business->terminology,
            'phone' => $business->phone, 'address' => $business->address,
            'features' => $business->features,
        ]);
    }

    public function employee(string $slug, string $employeeId): JsonResponse
    {
        $business = Business::where('slug', $slug)->where('active', true)->first();
        if (!$business) return response()->json(['message' => 'Negocio no encontrado'], 404);

        $employee = DB::table('profiles')->where('id', $employeeId)
            ->where('business_id', $business->id)->where('active', true)
            ->where('disable_agenda', false)
            ->select('id', 'full_name', 'avatar_url')->first();
        if (!$employee) return response()->json(['message' => 'Empleado no encontrado'], 404);

        return response()->json($employee);
    }

    public function services(string $slug): JsonResponse
    {
        $business = Business::where('slug', $slug)->where('active', true)->first();
        if (!$business) return response()->json(['message' => 'Negocio no encontrado'], 404);

        $services = Service::where('business_id', $business->id)->where('active', true)
            ->where(function ($q) use ($business) {
                $q->whereNull('branch_id');
                if ($business->branches()->count() > 0)
                    $q->orWhereIn('branch_id', $business->branches()->pluck('id'));
            })
            ->select('id', 'name', 'description', 'duration_minutes', 'price', 'color', 'branch_id')
            ->get();
        return response()->json($services);
    }

    /**
     * Get calendar data: occupied blocks (anonymized) + employee schedule + free slots.
     */
    public function calendar(Request $request, string $slug, string $employeeId): JsonResponse
    {
        $business = Business::where('slug', $slug)->where('active', true)->first();
        if (!$business) return response()->json(['message' => 'Negocio no encontrado'], 404);

        $employee = DB::table('profiles')->where('id', $employeeId)
            ->where('business_id', $business->id)->where('active', true)
            ->where('disable_agenda', false)->select('id', 'full_name')->first();
        if (!$employee) return response()->json(['message' => 'Empleado no encontrado'], 404);

        $from = $request->get('from', date('Y-m-d') . 'T00:00:00');
        $to = $request->get('to', date('Y-m-d') . 'T23:59:59');

        // Working hours for each day
        $schedules = DB::table('employee_schedules')->where('employee_id', $employeeId)
            ->select('weekday', 'start_time', 'end_time')->get();

        // Existing appointments (anonymized — no client info)
        $occupied = Appointment::where('business_id', $business->id)
            ->where('employee_id', $employeeId)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->whereNull('clinical_history')
            ->where('start_time', '>=', $from)
            ->where('start_time', '<', $to)
            ->select('start_time', 'end_time', 'status')
            ->orderBy('start_time')
            ->get()
            ->map(fn($a) => [
                'start' => $a->start_time, 'end' => $a->end_time,
                'status' => $a->status === 'confirmed' ? 'confirmed' : 'pending',
            ]);

        // Absences
        $absences = DB::table('employee_absences')->where('employee_id', $employeeId)
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('starts_at', [$from, $to])
                  ->orWhereBetween('ends_at', [$from, $to])
                  ->orWhere(fn($q2) => $q2->where('starts_at', '<=', $from)->where('ends_at', '>=', $to));
            })->select('starts_at as start', 'ends_at as end', DB::raw("'absence' as type"))->get();

        return response()->json([
            'employee' => $employee,
            'schedules' => $schedules,
            'occupied' => $occupied,
            'absences' => $absences,
        ]);
    }

    /**
     * Submit a booking request (no client info — employee assigns later).
     * Supports multiple services: creates one appointment per service with
     * sequential start times, all linked by the same group_id.
     */
    public function request(Request $request, string $slug): JsonResponse
    {
        $business = $this->findActiveBusiness($slug);
        if (!$business) return response()->json(['message' => 'Negocio no encontrado'], 404);

        if (!$this->isPublicBookingEnabled($business)) {
            return response()->json(['message' => 'Las reservas públicas no están disponibles para este negocio'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|uuid',
            'service_ids' => 'required|array|min:1',
            'service_ids.*' => 'uuid',
            'start_time' => 'required|date',
            'branch_id' => 'nullable|uuid',
            'client_name' => 'required|string|max:200',
        ]);

        $serviceIds = $validated['service_ids'];

        $services = Service::whereIn('id', $serviceIds)
            ->where('business_id', $business->id)
            ->select('id', 'name', 'duration_minutes', 'price')
            ->get()
            ->keyBy('id');

        if ($services->count() !== count($serviceIds)) {
            return response()->json(['message' => 'Uno o más servicios no encontrados'], 404);
        }

        $totalDuration = 0;
        foreach ($serviceIds as $sid) {
            $totalDuration += $services[$sid]->duration_minutes ?? 30;
        }

        $startTime = new \DateTime($validated['start_time']);
        $endTime = (clone $startTime)->add(new \DateInterval("PT{$totalDuration}M"));

        $conflict = Appointment::where('business_id', $business->id)
            ->where('employee_id', $validated['employee_id'])
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->whereNull('clinical_history')
            ->where('start_time', '<', $endTime->format('Y-m-d H:i:s'))
            ->where('end_time', '>', $startTime->format('Y-m-d H:i:s'))
            ->exists();

        if ($conflict) return response()->json(['message' => 'El horario ya no está disponible'], 409);

        $groupId = Str::uuid()->toString();
        $appointments = [];
        $cursor = clone $startTime;

        foreach ($serviceIds as $sid) {
            $svc = $services[$sid];
            $dur = $svc->duration_minutes ?? 30;
            $svcStart = clone $cursor;
            $svcEnd = (clone $cursor)->add(new \DateInterval("PT{$dur}M"));

            $appointment = Appointment::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $business->id,
                'branch_id' => $validated['branch_id'] ?? null,
                'client_id' => null, 'pet_id' => null,
                'employee_id' => $validated['employee_id'],
                'service_id' => $sid,
                'start_time' => $svcStart, 'end_time' => $svcEnd,
                'status' => 'pending', 'payment_status' => 'unpaid',
                'source' => 'public',
                'internal_notes' => $validated['client_name'],
                'group_id' => $groupId,
                'created_at' => now(), 'updated_at' => now(),
            ]);

            $appointments[] = [
                'appointment_id' => $appointment->id,
                'start_time' => $svcStart->format('Y-m-d\TH:i:s'),
                'end_time' => $svcEnd->format('Y-m-d\TH:i:s'),
                'status' => $appointment->status,
                'service_name' => $svc->name,
            ];

            $cursor = $svcEnd;
        }

        EntityChanged::safe($business->id, 'appointment', 'created', $groupId);

        return response()->json([
            'appointments' => $appointments,
            'message' => 'Reserva creada exitosamente',
        ], 201);
    }
}
