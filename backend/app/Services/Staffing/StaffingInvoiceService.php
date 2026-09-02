<?php

namespace App\Services\Staffing;

use App\Models\StaffingCompanyPayment;
use App\Models\StaffingInvoice;
use App\Models\StaffingTimesheet;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Generates the document Delta sends the client — one invoice per approved week, its total
 * always equal to the sum of that week's entries.invoice_total (which already bills overtime,
 * unlike the HILTON (2) sheet). Never hand-entered: the numbers come straight from the
 * timesheet a StaffingTimesheetService run already computed and persisted.
 */
class StaffingInvoiceService
{
    public function __construct(private StaffingCompanyService $companies) {}

    public function list(string $businessId, ?string $companyId = null, ?string $projectId = null): Collection
    {
        $query = StaffingInvoice::with(['company', 'project'])
            ->where('business_id', $businessId)
            ->orderByDesc('issue_date');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        return $query->get();
    }

    public function generateFromTimesheet(string $businessId, string $timesheetId, ?string $manualInvoiceNumber = null): StaffingInvoice
    {
        return DB::transaction(function () use ($businessId, $timesheetId, $manualInvoiceNumber) {
            $timesheet = StaffingTimesheet::with(['entries', 'project'])->lockForUpdate()->find($timesheetId);
            if (!$timesheet || $timesheet->business_id !== $businessId) {
                throw new NotFoundHttpException('Semana no encontrada.');
            }
            if ($timesheet->status === StaffingTimesheet::STATUS_DRAFT) {
                throw new RuntimeException('Aprueba la semana antes de facturarla.');
            }
            if (StaffingInvoice::where('timesheet_id', $timesheetId)->exists()) {
                throw new RuntimeException('Esta semana ya tiene una factura.');
            }

            $company = $this->companies->findForBusiness($timesheet->company_id, $businessId);
            $total = round((float) $timesheet->entries->sum('invoice_total'), 2);
            $issueDate = now()->toDateString();
            $termsDays = $company->payment_terms_days ?: 15;

            $invoiceNumber = !empty($manualInvoiceNumber)
                ? trim($manualInvoiceNumber)
                : $this->nextInvoiceNumber($businessId);

            if (StaffingInvoice::where('business_id', $businessId)->where('invoice_number', $invoiceNumber)->exists()) {
                throw new RuntimeException("El número de invoice #{$invoiceNumber} ya existe para este negocio. Por favor usa otro número.");
            }

            return StaffingInvoice::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'company_id' => $company->id,
                'timesheet_id' => $timesheet->id,
                'project_id' => $timesheet->project_id,
                'invoice_number' => $invoiceNumber,
                'issue_date' => $issueDate,
                'due_date' => now()->addDays($termsDays)->toDateString(),
                'terms_days' => $termsDays,
                'work_site' => $timesheet->project ? ($company->name . ' - ' . $timesheet->project->name) : $company->work_site,
                'subtotal' => $total,
                'total' => $total,
                'status' => StaffingInvoice::STATUS_SENT,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    /**
     * Sequential and scoped to one agency's own invoices — not globally unique, matching how
     * the sheets number them. Good enough for a low-traffic, admin-triggered action; a genuine
     * race would only ever produce a friendly "already taken" 422 on the unique index, not
     * corrupt data.
     */
    public function updateInvoiceNumber(string $id, string $businessId, string $newInvoiceNumber): StaffingInvoice
    {
        $invoice = $this->findForBusiness($id, $businessId);
        $trimmed = trim($newInvoiceNumber);

        if (empty($trimmed)) {
            throw new RuntimeException('El número de invoice no puede estar vacío.');
        }

        $exists = StaffingInvoice::where('business_id', $businessId)
            ->where('invoice_number', $trimmed)
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            throw new RuntimeException("El número de invoice #{$trimmed} ya está en uso en este negocio.");
        }

        $invoice->update(['invoice_number' => $trimmed]);

        return $invoice->fresh();
    }

    public function nextInvoiceNumber(string $businessId): string
    {
        $maxNumber = DB::table('staffing_invoices')
            ->where('business_id', $businessId)
            ->selectRaw('MAX(CAST(invoice_number AS INTEGER)) as max_num')
            ->value('max_num');

        return (string) (($maxNumber ?? 1000) + 1);
    }

    /**
     * Money owed by one company, aggregated in the database rather than summed in a PHP loop —
     * two SUM queries, not N+1. Unlike the supplier-debt calculation elsewhere in this app, this
     * number does not depend on whatever date range happens to be selected in the UI.
     */
    public function balanceForCompany(string $businessId, string $companyId): array
    {
        $invoiced = (float) StaffingInvoice::where('business_id', $businessId)
            ->where('company_id', $companyId)
            ->sum('total');

        $paid = (float) StaffingCompanyPayment::where('business_id', $businessId)
            ->where('company_id', $companyId)
            ->sum('amount');

        return [
            'invoiced' => $invoiced,
            'paid' => $paid,
            'pending' => max(0.0, $invoiced - $paid),
        ];
    }

    public function findForBusiness(string $id, string $businessId): StaffingInvoice
    {
        $invoice = StaffingInvoice::with(['company', 'timesheet.entries.employee'])->find($id);
        if (!$invoice || $invoice->business_id !== $businessId) {
            throw new NotFoundHttpException('Factura no encontrada.');
        }

        return $invoice;
    }

    /**
     * Undoes a facturación mistake: deletes the invoice and reopens its week (back to draft) so
     * the nómina can be edited again — invoicing is what locked it (saveWeek refuses anything
     * that isn't a draft). Any abonos already recorded against this invoice are not deleted; the
     * FK (`onDelete: set null`) just unlinks them into on-account payments for the company, so
     * the money already received stays on the books.
     *
     * @return string|null the reopened timesheet's id, for the caller to broadcast
     */
    public function destroy(string $id, string $businessId): ?string
    {
        return DB::transaction(function () use ($id, $businessId) {
            $invoice = StaffingInvoice::where('business_id', $businessId)->find($id);
            if (!$invoice) {
                throw new NotFoundHttpException('Factura no encontrada.');
            }

            $timesheet = StaffingTimesheet::find($invoice->timesheet_id);

            $invoice->delete();

            if ($timesheet && $timesheet->status !== StaffingTimesheet::STATUS_DRAFT) {
                $timesheet->update(['status' => StaffingTimesheet::STATUS_DRAFT, 'updated_at' => now()]);
            }

            return $timesheet?->id;
        });
    }
}
