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
}
