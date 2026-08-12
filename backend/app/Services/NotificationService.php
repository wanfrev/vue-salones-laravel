<?php

namespace App\Services;

use App\Models\Notification;
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
            $query->where('profile_id', $profileId);
        } elseif ($role === 'encargado' && $branchId) {
            $query->where(function ($q) use ($profileId, $branchId) {
                $q->where('profile_id', $profileId)
                  ->orWhere('branch_id', $branchId)
                  ->orWhereNull('branch_id');
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
        $query = Notification::with('branch')
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->limit(100);

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
    public function create(array $data): ?Notification
    {
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
     * Crea un lote de notificaciones y manda las push correspondientes en un
     * único envío. Es la vía por la que deben pasar todos los orígenes: así el
     * push sale con el contenido real y solo al perfil destinatario.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return Collection<int, Notification>
     */
    public function createMany(array $rows): Collection
    {
        $created = collect($rows)
            ->map(fn (array $row) => $this->create($row))
            ->filter()
            ->values();

        if ($created->isNotEmpty()) {
            $this->webPush->sendForNotifications($created);
        }

        return $created;
    }
}
