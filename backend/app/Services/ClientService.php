<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Pet;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ClientService
{
    public function list(string $businessId, ?string $branchId = null): Collection
    {
        $query = Client::query()
            ->where('business_id', $businessId)
            ->orderBy('full_name');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get();
    }

    public function store(array $data, string $businessId): Client
    {
        try {
            return DB::transaction(function () use ($data, $businessId) {
                $client = Client::create([
                    'id' => Str::uuid()->toString(),
                    'business_id' => $businessId,
                    'branch_id' => $data['branch_id'] ?? null,
                    'full_name' => $data['full_name'],
                    'phone' => $data['phone'],
                    'email' => $data['email'] ?? null,
                    'client_code' => $this->normalizeCode($data['client_code'] ?? null),
                    'notes' => $data['notes'] ?? null,
                    'birthday' => $data['birthday'] ?? null,
                    'metadata' => $data['metadata'] ?? [],
                    'middle_name' => $data['middle_name'] ?? null,
                    'last_name' => $data['last_name'] ?? null,
                    'second_last_name' => $data['second_last_name'] ?? null,
                    'document_id' => $data['document_id'] ?? null,
                    'medical_insurance' => $data['medical_insurance'] ?? null,
                    'emergency_phone' => $data['emergency_phone'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if (!empty($data['pets'])) {
                    $this->syncPets($client, $data['pets'], $businessId);
                }

                return $client;
            });
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, $this->duplicateMessage($e));
        }
    }

    public function update(string $id, array $data, string $businessId): Client
    {
        $client = $this->findForBusiness($id, $businessId);

        if (array_key_exists('client_code', $data)) {
            $data['client_code'] = $this->normalizeCode($data['client_code']);
        }

        try {
            DB::transaction(function () use ($client, $data, $businessId) {
                $client->update(array_filter($data, fn($k) => in_array($k, [
                    'full_name', 'phone', 'email', 'client_code', 'branch_id', 'notes', 'birthday', 'metadata',
                    'middle_name', 'last_name', 'second_last_name', 'document_id', 'medical_insurance', 'emergency_phone',
                ]), ARRAY_FILTER_USE_KEY) + ['updated_at' => now()]);

                if (array_key_exists('pets', $data)) {
                    $this->syncPets($client, $data['pets'], $businessId);
                }
            });
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, $this->duplicateMessage($e));
        }

        return $client->fresh();
    }

    private function normalizeCode(?string $code): ?string
    {
        $trimmed = trim((string) $code);
        return $trimmed === '' ? null : $trimmed;
    }

    private function duplicateMessage(\Illuminate\Database\UniqueConstraintViolationException $e): string
    {
        if (str_contains($e->getMessage(), 'clients_unique_code_idx')) {
            return 'Ya existe un cliente con ese código de identificación. Prueba con otro.';
        }
        return 'Ya existe un cliente registrado con este teléfono';
    }

    public function destroy(string $id, string $businessId): void
    {
        $client = $this->findForBusiness($id, $businessId);

        try {
            DB::transaction(function () use ($client) {
                $client->pets()->delete();
                $client->delete();
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if ((string) $e->getCode() === '23503') {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, 'No se puede eliminar el cliente porque tiene citas registradas. Para eliminarlo, primero elimina sus citas.');
            }
            throw $e;
        }
    }

    /**
     * Aggregated per-client stats computed in SQL instead of shipping every appointment row to the
     * frontend for a client-side reduce. Mismo criterio que ClientVisitService:
     *  - las citas canceladas / no asistió no cuentan ni suman al gasto;
     *  - el gasto usa el precio de cada cita (price_override) y, si no hay, el del servicio;
     *  - "última visita" es la última cita atendida (completada o pagada) que ya pasó, o la última
     *    venta directa del POS; una cita futura o cancelada ya no figura como visita;
     *  - las ventas directas del POS a nombre del cliente suman al gasto.
     * last_visit sale como fecha (Y-m-d) en la zona horaria del negocio.
     */
    public function stats(string $businessId, ?string $branchId = null): Collection
    {
        $now = Carbon::now('UTC')->format('Y-m-d H:i:s');

        $query = DB::table('appointments')
            ->leftJoin('services', function ($join) {
                $join->on('services.id', '=', 'appointments.service_id')
                    ->on('services.business_id', '=', 'appointments.business_id');
            })
            ->where('appointments.business_id', $businessId)
            ->selectRaw("appointments.client_id as client_id,
                SUM(CASE WHEN appointments.status IN ('cancelled', 'no_show') THEN 0 ELSE 1 END) as total_appointments,
                COALESCE(SUM(CASE WHEN appointments.status IN ('cancelled', 'no_show') THEN 0
                                  ELSE COALESCE(appointments.price_override, services.price, 0) END), 0) as total_spent,
                MAX(CASE WHEN (appointments.status = 'completed' OR appointments.payment_status = 'paid')
                              AND appointments.start_time <= ? THEN appointments.start_time END) as last_visit", [$now])
            ->groupBy('appointments.client_id');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('appointments.branch_id')->orWhere('appointments.branch_id', $branchId);
            });
        }

        $byClient = $query->get()->keyBy('client_id');

        $branchSql = $branchId ? 'AND (m.branch_id IS NULL OR m.branch_id = ?)' : '';
        $bindings = $branchId ? [$businessId, $branchId] : [$businessId];
        $sales = DB::select("
            SELECT x.client_id AS client_id, COALESCE(SUM(x.amount), 0) AS total, MAX(x.visited_at) AS last_sale
            FROM (
              SELECT m.client_id AS client_id,
                     MAX(COALESCE(t.total_amount, 0)) AS amount,
                     MIN(COALESCE(t.paid_at, m.created_at)) AS visited_at
              FROM inventory_movements m
              LEFT JOIN transactions t ON CAST(t.id AS TEXT) = CAST(m.reference_id AS TEXT) AND t.business_id = m.business_id
              WHERE m.business_id = ? AND m.client_id IS NOT NULL
                AND m.reference_type = 'direct' AND m.movement_type = 'sale' {$branchSql}
              GROUP BY m.client_id, m.reference_id
            ) x
            GROUP BY x.client_id
        ", $bindings);

        foreach ($sales as $sale) {
            $row = $byClient->get($sale->client_id) ?? (object) [
                'client_id' => $sale->client_id, 'total_appointments' => 0, 'total_spent' => 0, 'last_visit' => null,
            ];
            $row->total_spent = (float) $row->total_spent + (float) $sale->total;
            if ($sale->last_sale && (!$row->last_visit || Carbon::parse($sale->last_sale, 'UTC')->gt(Carbon::parse($row->last_visit, 'UTC')))) {
                $row->last_visit = $sale->last_sale;
            }
            $byClient->put($sale->client_id, $row);
        }

        $tz = \App\Models\Business::find($businessId)?->timezone ?: 'UTC';

        return $byClient->values()->map(function ($row) use ($tz) {
            $row->last_visit = $row->last_visit
                ? Carbon::parse($row->last_visit, 'UTC')->setTimezone($tz)->format('Y-m-d')
                : null;

            return $row;
        });
    }

    public function search(string $businessId, string $query, ?string $branchId = null): Collection
    {
        $term = $query . '%';

        $q = Client::query()
            ->where('business_id', $businessId)
            ->where(function ($q) use ($term) {
                $q->where('full_name', 'ilike', $term)
                  ->orWhere('phone', 'ilike', $term)
                  ->orWhere('client_code', 'ilike', $term)
                  ->orWhere('document_id', 'ilike', $term);
            })
            ->orderBy('full_name')
            ->limit(20);

        if ($branchId) {
            $q->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $q->get();
    }

    public function findOrCreateByPhone(string $businessId, string $phone, array $extra = []): Client
    {
        $client = Client::where('business_id', $businessId)
            ->where('phone', $phone)
            ->first();

        if ($client) {
            return $client;
        }

        return Client::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $extra['branch_id'] ?? null,
            'full_name' => $extra['full_name'] ?? 'Cliente sin nombre',
            'phone' => $phone,
            'email' => $extra['email'] ?? null,
            'notes' => $extra['notes'] ?? null,
            'metadata' => $extra['metadata'] ?? [],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function getHistory(string $id, string $businessId): Collection
    {
        $client = $this->findForBusiness($id, $businessId);

        return \App\Models\Appointment::with(['service', 'employeeProfile', 'transactions'])
            ->where('client_id', $id)
            ->where('business_id', $businessId)
            ->orderByDesc('start_time')
            ->get();
    }

    public function findForBusiness(string $id, string $businessId): Client
    {
        $client = Client::find($id);
        if (!$client || $client->business_id !== $businessId) {
            throw new NotFoundHttpException('Cliente no encontrado.');
        }
        return $client;
    }

    public function find(string $id): ?Client
    {
        return Client::find($id);
    }

    private function syncPets(Client $client, array $petsData, string $businessId): void
    {
        $existingIds = $client->pets()->pluck('id')->toArray();
        $updatedIds = [];

        foreach ($petsData as $petData) {
            if (!empty($petData['_delete'])) {
                continue;
            }

            $metadata = $petData['metadata'] ?? null;
            if (is_array($metadata) && empty($metadata)) {
                $metadata = null;
            }
            $birthday = $petData['birthday'] ?? null;
            if (is_string($birthday) && trim($birthday) === '') {
                $birthday = null;
            }
            $petPayload = [
                'business_id' => $businessId,
                'name' => $petData['name'],
                'breed' => $petData['breed'] ?? null,
                'weight' => $petData['weight'] ?? null,
                'birthday' => $birthday,
                'notes' => $petData['notes'] ?? null,
                'metadata' => $metadata,
            ];

            if (!empty($petData['id'])) {
                $pet = Pet::find($petData['id']);
                if ($pet && $pet->client_id === $client->id) {
                    $pet->update($petPayload + ['updated_at' => now()]);
                    $updatedIds[] = $pet->id;
                }
            } else {
                $pet = $client->pets()->create([
                    'id' => Str::uuid()->toString(),
                    'client_id' => $client->id,
                    ...$petPayload,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $updatedIds[] = $pet->id;
            }
        }

        // Delete pets explicitly marked for deletion
        foreach ($petsData as $petData) {
            if (!empty($petData['_delete']) && !empty($petData['id'])) {
                Pet::where('id', $petData['id'])->where('client_id', $client->id)->delete();
            }
        }
    }
}
