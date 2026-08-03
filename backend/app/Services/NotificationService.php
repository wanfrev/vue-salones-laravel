<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class NotificationService
{
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
        }
        // admin / superadmin: sin filtro adicional (ven todo el negocio)
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
            unset($notification->branch);
            unset($notification->relations['branch']);
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
        unset($notification->branch);
        unset($notification->relations['branch']);

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

    public function create(array $data): Notification
    {
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
    }
}
