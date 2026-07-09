<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EntityChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $businessId,
        public string $entity,
        public string $action, // 'created' | 'updated' | 'deleted'
        public ?string $entityId = null,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("business.{$this->businessId}")];
    }

    public function broadcastAs(): string
    {
        return 'entity.changed';
    }

    public static function safe(?string $businessId, string $entity, string $action, ?string $entityId = null): void
    {
        if (!$businessId) return;
        try {
            static::dispatch($businessId, $entity, $action, $entityId);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("EntityChanged broadcast failed: {$e->getMessage()}");
        }
    }
}
