<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Http\Controllers\Controller;
use App\Models\StaffingAnnualTax;
use App\Models\Profile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class StaffingAnnualTaxController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin acceso.']], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|uuid|exists:profiles,id',
            'year' => 'required|integer|min:2000|max:2100',
            'status' => ['nullable', 'string', Rule::in(['BLANK', 'SENT_TO_EMPLOYEE', 'SENT_TO_ACCOUNTANT', 'PENDING_TO_SEND'])],
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'file_date' => 'nullable|date',
        ]);

        $businessId = $p->business_id;

        $annualTax = StaffingAnnualTax::firstOrNew([
            'business_id' => $businessId,
            'employee_id' => $validated['employee_id'],
            'year' => $validated['year'],
        ]);

        if (isset($validated['status'])) {
            $annualTax->status = $validated['status'];
        }

        if (isset($validated['file_date'])) {
            $annualTax->file_date = $validated['file_date'];
        }

        if ($request->hasFile('file')) {
            if ($annualTax->file_path) {
                Storage::disk('private')->delete($annualTax->file_path);
            }

            $file = $request->file('file');
            $path = $file->store('staffing_annual_taxes', 'private');
            $annualTax->file_path = $path;
            $annualTax->file_original_name = $file->getClientOriginalName();
        }

        if (!$annualTax->exists) {
            $annualTax->created_by = $request->user()->id;
        }

        $annualTax->save();

        return response()->json($annualTax);
    }

    public function download(Request $request, string $id)
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            abort(403, 'Sin acceso.');
        }

        $annualTax = StaffingAnnualTax::where('business_id', $p->business_id)
            ->findOrFail($id);

        if (!$annualTax->file_path) {
            abort(404, 'No file attached');
        }

        return Storage::disk('private')->download(
            $annualTax->file_path,
            $annualTax->file_original_name ?? 'document'
        );
    }
    
    public function updateEmployee(Request $request, string $employeeId): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin acceso.']], 403);
        }
        $businessId = $p->business_id;

        $employee = Profile::where('business_id', $businessId)
            ->findOrFail($employeeId);

        $validated = $request->validate([
            'staffing_company_id' => 'nullable|uuid|exists:staffing_companies,id',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'ssn' => 'nullable|string|max:15',
        ]);

        if (array_key_exists('ssn', $validated)) {
            if ($validated['ssn'] === '' || $validated['ssn'] === null || $validated['ssn'] === $employee->ssn_last4) {
                unset($validated['ssn']);
            }
        }

        if (array_key_exists('staffing_company_id', $validated)) {
            $companyId = $validated['staffing_company_id'];
            unset($validated['staffing_company_id']);

            if ($companyId) {
                $exists = \App\Models\StaffingCompanyEmployee::where('employee_id', $employee->id)
                    ->where('company_id', $companyId)
                    ->exists();
                if (!$exists) {
                    \App\Models\StaffingCompanyEmployee::create([
                        'id' => \Illuminate\Support\Str::uuid()->toString(),
                        'business_id' => $businessId,
                        'company_id' => $companyId,
                        'employee_id' => $employee->id,
                        'role' => 'Staff', // Default role when assigned quickly from taxes
                    ]);
                }
            } else {
                \App\Models\StaffingCompanyEmployee::where('employee_id', $employee->id)->delete();
            }
        }

        $employee->fill($validated);
        $employee->save();

        return response()->json($employee);
    }
}
