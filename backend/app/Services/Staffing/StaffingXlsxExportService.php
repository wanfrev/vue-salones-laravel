<?php

namespace App\Services\Staffing;

use App\Models\StaffingInvoice;
use App\Models\StaffingTimesheet;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Builds the same two documents StaffingHoursPanel.vue/BillingPanel.vue already print
 * (staffingPayrollPrint.ts / staffingInvoicePrint.ts) as real .xlsx workbooks instead of an
 * HTML print window — same column set, same pay-rate-vs-bill-rate isolation (the payroll sheet
 * carries pay_rate and is never handed to the client; the invoice sheet carries bill_rate only
 * and never pay_rate, matching StaffingPayrollCalculator::invoice()).
 */
class StaffingXlsxExportService
{
    private const HEADER_FILL = 'F2F2F2';
    private const MONEY_FORMAT = '"$"#,##0.00';

    public function payrollWorkbook(StaffingTimesheet $timesheet): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Nomina');

        $company = $timesheet->company;
        $sheet->setCellValue('A1', $company?->name ?? 'Empresa');
        $sheet->setCellValue('A2', 'Semana: ' . $timesheet->week_start->format('Y-m-d') . ' a ' . $timesheet->week_end->format('Y-m-d'));
        $sheet->setCellValue('A3', 'Estado: ' . $timesheet->status);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $headers = [
            'Empleado', 'Rol', 'Turno', 'Horas totales', 'Manual', 'Horas regulares', 'Pay rate', 'Bill rate',
            'Total regular', 'Horas OT', 'Total OT', 'Deducción', 'Fee fijo', 'Ajuste',
            'Total perdiem', 'Total viaje',
            'Total semanal', '% retención', 'Total (payout)', 'Factura', 'Margen',
        ];
        $headerRow = 5;
        foreach ($headers as $i => $label) {
            $sheet->setCellValue([$i + 1, $headerRow], $label);
        }
        $lastCol = $sheet->getCell([count($headers), $headerRow])->getColumn();
        $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->getFont()->setBold(true);
        $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->getFill()
            ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::HEADER_FILL);

        $row = $headerRow + 1;
        $moneyCols = [7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21];
        foreach ($timesheet->entries as $entry) {
            $totalRegular = $entry->regular_hours * $entry->pay_rate;
            $overtimeAmount = $entry->gross - $totalRegular + $entry->pre_tax_deduction;
            $taxPercent = $entry->gross > 0 ? ($entry->tax_withheld / $entry->gross) * 100 : 0;

            $values = [
                $entry->employee?->full_name, $entry->role, $entry->shift, $entry->total_hours,
                $entry->hours_manual_override ? 'Sí' : 'No', $entry->regular_hours, $entry->pay_rate, $entry->bill_rate,
                $totalRegular, $entry->overtime_hours, $overtimeAmount, $entry->pre_tax_deduction,
                $entry->fixed_fees, $entry->adjustment,
                $entry->perdiem_total, $entry->travel_total,
                $entry->gross, round($taxPercent, 1), $entry->payout, $entry->invoice_total, $entry->margin,
            ];
            foreach ($values as $i => $value) {
                $sheet->setCellValue([$i + 1, $row], $value);
            }
            foreach ($moneyCols as $col) {
                $sheet->getStyle([$col, $row])->getNumberFormat()->setFormatCode(self::MONEY_FORMAT);
            }
            $row++;
        }

        for ($col = 1; $col <= count($headers); $col++) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }

        return $spreadsheet;
    }

    /**
     * Bill rate only — pay_rate never appears on this sheet, same isolation as
     * StaffingPayrollCalculator::invoice() and printStaffingInvoice().
     */
    public function invoiceWorkbook(StaffingInvoice $invoice): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Invoice');

        $timesheet = $invoice->timesheet;
        $sheet->setCellValue('A1', 'Invoice #' . $invoice->invoice_number);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->setCellValue('A2', 'Bill to: ' . ($invoice->company?->name ?? ''));
        $sheet->setCellValue('A3', 'Issue date: ' . $invoice->issue_date->format('Y-m-d') . '   Due date: ' . $invoice->due_date->format('Y-m-d') . ' (' . $invoice->terms_days . ' days)');
        if ($invoice->work_site) {
            $sheet->setCellValue('A4', 'Work site: ' . $invoice->work_site);
        }

        $headers = ['Staff name', 'Total hours', 'Reg hours', 'Reg rate', 'Reg amount', 'OT hours', 'OT rate', 'OT amount', 'Travel', 'Total amount'];
        $headerRow = 6;
        foreach ($headers as $i => $label) {
            $sheet->setCellValue([$i + 1, $headerRow], $label);
        }
        $lastCol = $sheet->getCell([count($headers), $headerRow])->getColumn();
        $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->getFont()->setBold(true);
        $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->getFill()
            ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::HEADER_FILL);

        $row = $headerRow + 1;
        $moneyCols = [4, 5, 7, 8, 9, 10];
        foreach ($timesheet?->entries ?? [] as $entry) {
            $regularAmount = $entry->invoice_regular_amount ?? ($entry->regular_hours * $entry->bill_rate);
            $travelTotal = $entry->travel_total ?? 0.0;
            // Travel is billed to the client (unlike perdiem) and already folded into
            // invoice_total — subtracted back out here so it gets its own column instead of
            // silently inflating OT for legacy rows without a persisted invoice_overtime_amount.
            $overtimeAmount = $entry->invoice_overtime_amount ?? ($entry->invoice_total - $regularAmount - $travelTotal);
            $overtimeRate = $entry->overtime_hours > 0 ? $overtimeAmount / $entry->overtime_hours : 0;

            $values = [
                $entry->employee?->full_name, $entry->total_hours, $entry->regular_hours, $entry->bill_rate,
                $regularAmount, $entry->overtime_hours, $overtimeRate, $overtimeAmount, $travelTotal, $entry->invoice_total,
            ];
            foreach ($values as $i => $value) {
                $sheet->setCellValue([$i + 1, $row], $value);
            }
            foreach ($moneyCols as $col) {
                $sheet->getStyle([$col, $row])->getNumberFormat()->setFormatCode(self::MONEY_FORMAT);
            }
            $row++;
        }

        $sheet->setCellValue([9, $row + 1], 'Total due:');
        $sheet->getStyle([9, $row + 1])->getFont()->setBold(true);
        $sheet->getStyle([9, $row + 1])->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->setCellValue([10, $row + 1], (float) $invoice->total);
        $sheet->getStyle([10, $row + 1])->getFont()->setBold(true);
        $sheet->getStyle([10, $row + 1])->getNumberFormat()->setFormatCode(self::MONEY_FORMAT);

        for ($col = 1; $col <= count($headers); $col++) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }

        return $spreadsheet;
    }
}
