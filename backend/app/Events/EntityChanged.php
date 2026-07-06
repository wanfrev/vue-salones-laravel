<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EntityChanged implements ShouldBroadcastNow
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
        return [new Channel("business.{$this->businessId}")];
    }

    public function broadcastAs(): string
    {
        return 'entity.changed';
    }
}
