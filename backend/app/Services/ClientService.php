<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Pet;
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
        return DB::transaction(function () use ($data, $businessId) {
            $client = Client::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $data['branch_id'] ?? null,
                'full_name' => $data['full_name'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'notes' => $data['notes'] ?? null,
                'birthday' => $data['birthday'] ?? null,
                'metadata' => $data['metadata'] ?? [],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (!empty($data['pets'])) {
                $this->syncPets($client, $data['pets'], $businessId);
            }

            return $client;
        });
    }

    public function update(string $id, array $data, string $businessId): Client
    {
        $client = $this->findForBusiness($id, $businessId);

        DB::transaction(function () use ($client, $data, $businessId) {
            $client->update(array_filter($data, fn($k) => in_array($k, [
                'full_name', 'phone', 'email', 'branch_id', 'notes', 'birthday', 'metadata',
            ]), ARRAY_FILTER_USE_KEY) + ['updated_at' => now()]);

            if (array_key_exists('pets', $data)) {
                $this->syncPets($client, $data['pets'], $businessId);
            }
        });

        return $client->fresh();
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

    public function search(string $businessId, string $query, ?string $branchId = null): Collection
    {
        $term = $query . '%';

        $q = Client::query()
            ->where('business_id', $businessId)
            ->where(function ($q) use ($term) {
                $q->where('full_name', 'ilike', $term)
                  ->orWhere('phone', 'ilike', $term);
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
            $petPayload = [
                'business_id' => $businessId,
                'name' => $petData['name'],
                'breed' => $petData['breed'] ?? null,
                'weight' => $petData['weight'] ?? null,
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
