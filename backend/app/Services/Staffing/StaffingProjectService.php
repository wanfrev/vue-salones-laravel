<?php

namespace App\Services\Staffing;

use App\Models\StaffingProject;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StaffingProjectService
{
    public function __construct(
        private StaffingCompanyService $companies
    ) {}

    public function listForCompany(string $businessId, string $companyId): Collection
    {
        return StaffingProject::where('business_id', $businessId)
            ->where('company_id', $companyId)
            ->orderBy('name')
            ->get();
    }

    public function allForBusiness(string $businessId): Collection
    {
        return StaffingProject::where('business_id', $businessId)
            ->orderBy('name')
            ->get();
    }

    public function create(string $businessId, string $companyId, array $data): StaffingProject
    {
        $company = $this->companies->findForBusiness($companyId, $businessId);

        $exists = StaffingProject::where('company_id', $company->id)
            ->where('name', $data['name'])
            ->exists();

        if ($exists) {
            throw new RuntimeException('Ya existe un proyecto con ese nombre en esta empresa.');
        }

        return StaffingProject::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'company_id' => $company->id,
            'name' => $data['name'],
            'active' => $data['active'] ?? true,
        ]);
    }

    public function update(string $businessId, string $companyId, string $projectId, array $data): StaffingProject
    {
        $project = StaffingProject::where('business_id', $businessId)
            ->where('company_id', $companyId)
            ->findOrFail($projectId);

        if (isset($data['name']) && $data['name'] !== $project->name) {
            $exists = StaffingProject::where('company_id', $companyId)
                ->where('name', $data['name'])
                ->where('id', '!=', $project->id)
                ->exists();

            if ($exists) {
                throw new RuntimeException('Ya existe un proyecto con ese nombre en esta empresa.');
            }
        }

        $project->update($data);
        return $project;
    }

    public function delete(string $businessId, string $companyId, string $projectId): void
    {
        $project = StaffingProject::where('business_id', $businessId)
            ->where('company_id', $companyId)
            ->findOrFail($projectId);

        // Optional: Ensure it's not being used in timesheets? 
        // We set onDelete restrict in DB for timesheets.
        $project->delete();
    }
}
