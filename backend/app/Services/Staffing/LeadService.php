<?php

namespace App\Services\Staffing;

use App\Models\Lead;
use App\Models\Profile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
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
            ->with('owner:id,full_name')
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
            'email' => $data['email'] ?? null,
            'status' => $data['status'] ?? 'new',
            'visit_date' => $data['visit_date'] ?? null,
            'company_category' => $data['company_category'] ?? null,
            'priority' => $data['priority'] ?? null,
            'contact_card' => $data['contact_card'] ?? null,
            'state' => $data['state'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * The admin CRM sidebar roster: every non-staffing-worker employee (a "vendedora" — plain
     * `empleado`/`encargado` with no client-company assignments) and how many leads she owns, in
     * one aggregated query rather than N+1 counts.
     *
     * @return list<array{id: string, name: string, leadCount: int}>
     */
    public function vendedoraRoster(string $businessId): array
    {
        $vendedoras = Profile::query()
            ->where('business_id', $businessId)
            ->whereIn('role', ['empleado', 'encargado'])
            ->whereDoesntHave('staffingCompanyEmployees')
            ->orderBy('full_name')
            ->get(['id', 'full_name']);

        if ($vendedoras->isEmpty()) {
            return [];
        }

        $counts = Lead::where('business_id', $businessId)
            ->whereIn('owner_id', $vendedoras->pluck('id'))
            ->select('owner_id', DB::raw('COUNT(*) as lead_count'))
            ->groupBy('owner_id')
            ->pluck('lead_count', 'owner_id');

        return $vendedoras->map(fn (Profile $v) => [
            'id' => $v->id,
            'name' => $v->full_name,
            'leadCount' => (int) ($counts[$v->id] ?? 0),
        ])->all();
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
