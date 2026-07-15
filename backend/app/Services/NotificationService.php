<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class NotificationService
{
    public function list(string $businessId, string $profileId, ?bool $unreadOnly = false, bool $isAdmin = false): Collection
    {
        $query = Notification::where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->limit(100);

        if (!$isAdmin) {
            $query->where('profile_id', $profileId);
        }

        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        return $query->get();
    }

    public function markRead(string $id, string $businessId, string $profileId, bool $isAdmin = false): Notification
    {
        $query = Notification::where('id', $id)
            ->where('business_id', $businessId);

        if (!$isAdmin) {
            $query->where('profile_id', $profileId);
        }

        $notification = $query->first();

        if (!$notification) {
            throw new NotFoundHttpException('Notificación no encontrada.');
        }

        $notification->update(['is_read' => true, 'read_at' => now()]);
        return $notification->fresh();
    }

    public function markAllRead(string $businessId, string $profileId, bool $isAdmin = false): void
    {
        $query = Notification::where('business_id', $businessId)
            ->where('is_read', false);

        if (!$isAdmin) {
            $query->where('profile_id', $profileId);
        }

        $query->update(['is_read' => true, 'read_at' => now()]);
    }

    public function dismiss(string $id, string $businessId, string $profileId, bool $isAdmin = false): void
    {
        $query = Notification::where('id', $id)
            ->where('business_id', $businessId);

        if (!$isAdmin) {
            $query->where('profile_id', $profileId);
        }

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
