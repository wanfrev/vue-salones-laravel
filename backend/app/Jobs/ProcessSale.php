<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Models\InventoryMovement;
use App\Services\InventoryService;
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

    public function handle(InventoryService $inventory, NotificationService $notifications): void
    {
        if (!empty($this->products)) {
            $appointment = Appointment::find($this->appointmentId);

            if ($appointment) {
                $locationId = $inventory->getDefaultLocation($appointment->business_id, $appointment->branch_id);

                foreach ($this->products as $product) {
                    $inventory->recordMovement(
                        businessId: $appointment->business_id,
                        locationId: $product['location_id'] ?? $locationId,
                        productId: $product['product_id'],
                        variantId: $product['variant_id'] ?? null,
                        movementType: 'sale',
                        quantity: -($product['quantity'] ?? 1),
                        unitCost: $product['unit_cost'] ?? 0,
                        referenceType: 'appointment',
                        referenceId: $this->appointmentId,
                        notes: 'Venta POS #' . $this->transactionId,
                        branchId: $appointment->branch_id,
                    );
                }
            }
        }

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
