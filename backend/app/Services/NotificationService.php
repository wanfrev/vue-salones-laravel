<?php

namespace App\Services;

use App\Jobs\SendWebPushNotificationsJob;
use App\Models\Notification;
use App\Models\Profile;
use App\Support\NicheRegistry;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class NotificationService
{
    public function __construct(
        private WebPushService $webPush,
    ) {}

    private function applyAccessFilter($query, string $role, string $profileId, ?string $branchId): void
    {
        if ($role === 'empleado') {
            // A recibo-only employee can't reach any screen a notification would deep-link
            // into, so none should surface here either — matters mainly for rows created
            // before this business turned the feature on.
            if ($this->isReceiptOnlyEmployee($profileId)) {
                $query->whereRaw('1 = 0');
                return;
            }
            $query->where('profile_id', $profileId);
        } elseif ($role === 'encargado') {
            // Sin `orWhereNull('branch_id')` a propósito: un aviso dirigido a un empleado
            // puntual (nueva cita, etc.) puede quedar sin branch_id por un bug o una carrera
            // en su creación (ya paso — ver commit que agrego este comentario), y ese hueco
            // dejaba a CUALQUIER encargada ver avisos de empleados de OTRA sucursal. Los avisos
            // realmente globales (stock bajo, etc.) ya llegan con profile_id = la propia
            // encargada, asi que igual los ve por la primera condicion — no hacia falta el
            // catch-all de branch_id nulo.
            // Tampoco se exige `$branchId` (una encargada sin sucursal asignada en su perfil
            // ya no cae al bloque de abajo, que la trataria como admin viendo todo el negocio).
            $query->where(function ($q) use ($profileId, $branchId) {
                $q->where('profile_id', $profileId);
                if ($branchId) {
                    $q->orWhere('branch_id', $branchId);
                }
            });
        } else {
            // admin / superadmin: ven toda la actividad del negocio, pero no las filas
            // dirigidas específicamente a un empleado raso — esas son la copia de un
            // evento (ej. "nueva cita") del que el admin ya tiene su propia fila con
            // el resumen completo (cliente, servicio y empleado). Sin este filtro, el
            // admin veía dos tarjetas por la misma cita: la suya y la del empleado.
            $query->where(function ($q) use ($profileId) {
                $q->where('profile_id', $profileId)
                  ->orWhereHas('profile', fn($p) => $p->whereIn('role', ['admin', 'superadmin', 'encargado']));
            });
        }
    }

    public function list(string $businessId, string $profileId, ?bool $unreadOnly = false, string $role = 'empleado', ?string $branchId = null): Collection
    {
        $limit = 100;

        $query = Notification::with('branch:id,name')
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->limit($limit);

        $this->applyAccessFilter($query, $role, $profileId, $branchId);

        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        return $query->get()->map(function ($notification) {
            if ($notification->branch) {
                $notification->branch_name = $notification->branch->name;
            }
            $notification->unsetRelation('branch');
            return $notification;
        });
    }

    public function markRead(string $id, string $businessId, string $profileId, string $role = 'empleado', ?string $branchId = null): Notification
    {
        $query = Notification::with('branch')
            ->where('id', $id)
            ->where('business_id', $businessId);

        $this->applyAccessFilter($query, $role, $profileId, $branchId);

        $notification = $query->first();

        if (!$notification) {
            throw new NotFoundHttpException('Notificación no encontrada.');
        }

        $notification->update(['is_read' => true, 'read_at' => now()]);
        $notification->refresh();

        if ($notification->branch) {
            $notification->branch_name = $notification->branch->name;
        }
        $notification->unsetRelation('branch');

        return $notification;
    }

    public function markAllRead(string $businessId, string $profileId, string $role = 'empleado', ?string $branchId = null): void
    {
        $query = Notification::where('business_id', $businessId)
            ->where('is_read', false);

        $this->applyAccessFilter($query, $role, $profileId, $branchId);

        $query->update(['is_read' => true, 'read_at' => now()]);
    }

    public function dismiss(string $id, string $businessId, string $profileId, string $role = 'empleado', ?string $branchId = null): void
    {
        $query = Notification::where('id', $id)
            ->where('business_id', $businessId);

        $this->applyAccessFilter($query, $role, $profileId, $branchId);

        $notification = $query->first();

        if ($notification) {
            $notification->delete();
        }
    }

    /**
     * Crea una notificación. Devuelve null si choca con un índice único (hoy
     * solo `new_appointment` duplicada) en lugar de lanzar: una colisión no
     * debe abortar el resto de un lote ni la petición que la originó.
     */
    public function create(array $data, ?bool $receiptOnlyOverride = null): ?Notification
    {
        $isReceiptOnly = $receiptOnlyOverride ?? $this->isReceiptOnlyEmployee($data['profile_id']);
        if ($isReceiptOnly) {
            return null;
        }

        try {
            return Notification::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $data['business_id'],
                'branch_id' => $data['branch_id'] ?? null,
                'profile_id' => $data['profile_id'],
                'type' => $data['type'] ?? 'info',
                'title' => $data['title'],
                'message' => $data['message'] ?? '',
                'appointment_id' => $data['appointment_id'] ?? null,
                'client_name' => $data['client_name'] ?? null,
                'client_phone' => $data['client_phone'] ?? null,
                'service_name' => $data['service_name'] ?? null,
                'appointment_time' => $data['appointment_time'] ?? null,
                'metadata' => $data['metadata'] ?? [],
                'is_read' => false,
                'created_at' => now(),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            Log::info('[notifications] Duplicada, se omite: ' . ($data['type'] ?? 'info') . ' / ' . ($data['appointment_id'] ?? '-') . ' / ' . $data['profile_id']);
            return null;
        }
    }

    /**
     * `employees_recibo_only` confines an 'empleado' to /dashboard/recibo — no agenda, no
     * inbox, nothing a notification could ever link to. Checked here, the single choke point
     * every origin (appointments, reminders, birthdays) already funnels through, so no call
     * site needs its own copy of this rule and a push never goes out to a device that has no
     * screen to show it on.
     */
    private function isReceiptOnlyEmployee(string $profileId): bool
    {
        $profile = Profile::with('business')->find($profileId);
        if (!$profile || $profile->role !== 'empleado' || !$profile->business) {
            return false;
        }

        $features = NicheRegistry::resolveFeatures($profile->business->niche_type, $profile->business->features);

        return (bool) ($features['employees_recibo_only'] ?? false);
    }

    /**
     * Crea un lote de notificaciones y despacha las push en segundo plano (cola).
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return Collection<int, Notification>
     */
    public function createMany(array $rows): Collection
    {
        if (empty($rows)) {
            return collect();
        }

        // Precargar perfiles + negocio en 1 sola consulta para evitar N+1 en isReceiptOnlyEmployee().
        $profileIds = collect($rows)->pluck('profile_id')->filter()->unique()->values()->all();
        $profilesById = empty($profileIds)
            ? collect()
            : Profile::with('business')->whereIn('id', $profileIds)->get()->keyBy('id');

        $receiptOnlyMap = [];
        foreach ($profilesById as $id => $profile) {
            if ($profile->role !== 'empleado' || !$profile->business) {
                $receiptOnlyMap[$id] = false;
                continue;
            }
            $features = NicheRegistry::resolveFeatures($profile->business->niche_type, $profile->business->features);
            $receiptOnlyMap[$id] = (bool) ($features['employees_recibo_only'] ?? false);
        }

        $created = collect($rows)
            ->map(function (array $row) use ($receiptOnlyMap) {
                $pid = $row['profile_id'] ?? null;
                $override = ($pid && array_key_exists($pid, $receiptOnlyMap)) ? $receiptOnlyMap[$pid] : null;
                return $this->create($row, $override);
            })
            ->filter()
            ->values();

        if ($created->isNotEmpty()) {
            try {
                SendWebPushNotificationsJob::dispatch($created->pluck('id')->all());
            } catch (\Throwable $e) {
                Log::warning("[NotificationService] No se pudo encolar WebPush: {$e->getMessage()}");
            }
        }

        return $created;
    }
}
