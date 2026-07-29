<?php

namespace App\Http\Controllers\Api;

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
    public function business(string $slug): JsonResponse
    {
        $business = Business::where('slug', $slug)->where('active', true)->first();
        if (!$business) return response()->json(['message' => 'Negocio no encontrado'], 404);

        return response()->json([
            'id' => $business->id,
            'name' => $business->name, 'timezone' => $business->timezone,
            'currency' => $business->currency, 'niche_type' => $business->niche_type,
            'theme_config' => $business->theme_config, 'terminology' => $business->terminology,
            'phone' => $business->phone, 'address' => $business->address,
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
     */
    public function request(Request $request, string $slug): JsonResponse
    {
        $business = Business::where('slug', $slug)->where('active', true)->first();
        if (!$business) return response()->json(['message' => 'Negocio no encontrado'], 404);

        $validated = $request->validate([
            'employee_id' => 'required|uuid',
            'service_id' => 'required|uuid',
            'start_time' => 'required|date',
            'branch_id' => 'nullable|uuid',
            'client_name' => 'nullable|string|max:200',
        ]);

        $service = Service::where('id', $validated['service_id'])
            ->where('business_id', $business->id)->first();
        if (!$service) return response()->json(['message' => 'Servicio no encontrado'], 404);

        $duration = $service->duration_minutes ?? 30;
        $startTime = new \DateTime($validated['start_time']);
        $endTime = (clone $startTime)->add(new \DateInterval("PT{$duration}M"));

        $conflict = Appointment::where('business_id', $business->id)
            ->where('employee_id', $validated['employee_id'])
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->whereNull('clinical_history')
            ->where('start_time', '<', $endTime->format('Y-m-d H:i:s'))
            ->where('end_time', '>', $startTime->format('Y-m-d H:i:s'))
            ->exists();

        if ($conflict) return response()->json(['message' => 'El horario ya no está disponible'], 409);

        $appointment = Appointment::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $business->id,
            'branch_id' => $validated['branch_id'] ?? null,
            'client_id' => null, 'pet_id' => null,
            'employee_id' => $validated['employee_id'],
            'service_id' => $validated['service_id'],
            'start_time' => $startTime, 'end_time' => $endTime,
            'status' => 'pending', 'payment_status' => 'unpaid',
            'source' => 'public',
            'internal_notes' => $validated['client_name'] ?? null,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json([
            'appointment_id' => $appointment->id,
            'start_time' => $startTime->format('Y-m-d\TH:i:s'),
            'end_time' => $endTime->format('Y-m-d\TH:i:s'),
            'status' => $appointment->status,
        ], 201);
    }
}
