<?php

namespace App\Services\Staffing;

use App\Models\Lead;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Each vendedora's leads are private by default — a plain 'empleado' only ever sees and edits
 * their own rows, enforced here (not just hidden in the UI) since this is the one place in the
 * app where two staff members must not see each other's records at all. admin/encargado see
 * every lead for the business, the same oversight they already have everywhere else.
 */
class LeadService
{
    public function list(string $businessId, string $viewerId, bool $isAdmin): Collection
    {
        $query = Lead::query()
            ->where('business_id', $businessId)
            ->orderByDesc('updated_at');

        if (!$isAdmin) {
            $query->where('owner_id', $viewerId);
        }

        return $query->get();
    }

    public function store(array $data, string $businessId, string $ownerId): Lead
    {
        return Lead::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'owner_id' => $ownerId,
            'company_name' => $data['company_name'],
            'work_area' => $data['work_area'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'] ?? 'new',
            'notes' => $data['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId, string $viewerId, bool $isAdmin): Lead
    {
        $lead = $this->findForViewer($id, $businessId, $viewerId, $isAdmin);
        $lead->update($data + ['updated_at' => now()]);

        return $lead->fresh();
    }

    public function destroy(string $id, string $businessId, string $viewerId, bool $isAdmin): void
    {
        $lead = $this->findForViewer($id, $businessId, $viewerId, $isAdmin);
        $lead->delete();
    }

    /**
     * Same 404-not-403 treatment StaffingCompanyService uses for a cross-tenant id: a lead that
     * belongs to a colleague (or another business) reads as "not found", not "forbidden" — it
     * doesn't confirm the id even exists to someone who shouldn't be looking at it.
     */
    private function findForViewer(string $id, string $businessId, string $viewerId, bool $isAdmin): Lead
    {
        $lead = Lead::find($id);
        if (!$lead || $lead->business_id !== $businessId) {
            throw new NotFoundHttpException('Lead no encontrado.');
        }
        if (!$isAdmin && $lead->owner_id !== $viewerId) {
            throw new NotFoundHttpException('Lead no encontrado.');
        }

        return $lead;
    }
}
