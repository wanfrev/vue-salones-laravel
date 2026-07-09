<?php

namespace App\Services;

use App\Models\Client;
use Illuminate\Support\Collection;
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
        return Client::create([
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
    }

    public function update(string $id, array $data, string $businessId): Client
    {
        $client = $this->findForBusiness($id, $businessId);

        $client->update(array_filter($data, fn($k) => in_array($k, [
            'full_name', 'phone', 'email', 'branch_id', 'notes', 'birthday', 'metadata',
        ]), ARRAY_FILTER_USE_KEY) + ['updated_at' => now()]);

        return $client->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $client = $this->findForBusiness($id, $businessId);

        try {
            $client->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            if ((string) $e->getCode() === '23503') {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, 'No se puede eliminar el cliente porque tiene citas registradas. Para eliminarlo, primero elimina sus citas.');
            }
            throw $e;
        }
    }

    public function search(string $businessId, string $query): Collection
    {
        $term = '%' . $query . '%';

        return Client::query()
            ->where(function ($q) use ($term) {
                $q->where('full_name', 'ilike', $term)
                  ->orWhere('phone', 'ilike', $term);
            })
            ->orderBy('full_name')
            ->limit(20)
            ->get();
    }

    public function findOrCreateByPhone(string $businessId, string $phone, array $extra = []): Client
    {
        $client = Client::where('phone', $phone)
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
}
