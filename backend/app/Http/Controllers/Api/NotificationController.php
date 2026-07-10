<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController
{
    public function __construct(
        private NotificationService $notificationService,
    ) {}

    private function resolve(Request $request): ?object
    {
        $user = $request->user()?->load('profile');
        return $user?->profile;
    }

    public function index(Request $request): JsonResponse
    {
        $p = $this->resolve($request);
        if (!$p || !$p->business_id || !$p->id) return response()->json([]);

        return response()->json(
            $this->notificationService->list($p->business_id, $p->id, $request->get('unread_only'))
        );
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $p = $this->resolve($request);
        if (!$p || !$p->business_id || !$p->id) return response()->json(['error' => ['message' => 'Sin acceso.']], 403);

        $notification = $this->notificationService->markRead($id, $p->business_id, $p->id);
        EntityChanged::safe($p->business_id, 'notification', 'updated', $id);

        return response()->json($notification);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $p = $this->resolve($request);
        if (!$p || !$p->business_id || !$p->id) return response()->json(['error' => ['message' => 'Sin acceso.']], 403);

        $this->notificationService->markAllRead($p->business_id, $p->id);
        EntityChanged::safe($p->business_id, 'notification', 'updated', 'all');

        return response()->json(['success' => true]);
    }

    public function dismiss(Request $request, string $id): JsonResponse
    {
        $p = $this->resolve($request);
        if (!$p || !$p->business_id || !$p->id) return response()->json(['error' => ['message' => 'Sin acceso.']], 403);

        $this->notificationService->dismiss($id, $p->business_id, $p->id);
        EntityChanged::safe($p->business_id, 'notification', 'deleted', $id);

        return response()->json(null, 204);
    }
}
