<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class NotificationService
{
    public function list(string $businessId, string $profileId, ?bool $unreadOnly = false): Collection
    {
        $query = Notification::where('business_id', $businessId)
            ->where('profile_id', $profileId)
            ->orderByDesc('created_at')
            ->limit(100);

        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        return $query->get();
    }

    public function markRead(string $id, string $businessId, string $profileId): Notification
    {
        $notification = Notification::where('id', $id)
            ->where('business_id', $businessId)
            ->where('profile_id', $profileId)
            ->first();

        if (!$notification) {
            throw new NotFoundHttpException('Notificación no encontrada.');
        }

        $notification->update(['is_read' => true, 'read_at' => now()]);
        return $notification->fresh();
    }

    public function markAllRead(string $businessId, string $profileId): void
    {
        Notification::where('business_id', $businessId)
            ->where('profile_id', $profileId)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);
    }

    public function dismiss(string $id, string $businessId, string $profileId): void
    {
        $notification = Notification::where('id', $id)
            ->where('business_id', $businessId)
            ->where('profile_id', $profileId)
            ->first();

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
