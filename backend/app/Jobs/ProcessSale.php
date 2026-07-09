<?php

namespace App\Jobs;

use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessSale implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $transactionId,
        public string $businessId,
        public string $appointmentId,
        public float $amount,
        public string $method,
        public array $products = [],
        public ?string $employeeName = null,
        public ?string $clientName = null,
        public ?string $serviceName = null,
        public ?string $employeeId = null,
    ) {}

    public function handle(NotificationService $notifications): void
    {
        if ($this->employeeId && $this->clientName && $this->serviceName) {
            $notifications->create([
                'business_id' => $this->businessId,
                'profile_id' => $this->employeeId,
                'appointment_id' => $this->appointmentId,
                'type' => 'sale_completed',
                'title' => 'Venta completada',
                'message' => "Venta de {$this->clientName} — {$this->serviceName} — \${$this->amount}",
                'client_name' => $this->clientName,
                'service_name' => $this->serviceName,
                'metadata' => [
                    'transaction_id' => $this->transactionId,
                    'amount' => $this->amount,
                    'method' => $this->method,
                    'product_count' => count($this->products),
                ],
            ]);
        }
    }
}
