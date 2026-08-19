<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CreditController;
use App\Http\Controllers\Api\EmployeeCommissionController;
use App\Http\Controllers\Api\EmployeeDocumentController;
use App\Http\Controllers\Api\EmployeePaymentController;
use App\Http\Controllers\Api\EmployeeScheduleController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FinancialSummaryController;

use App\Http\Controllers\Api\GiftCardController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PetController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\PublicBookingController;
use App\Http\Controllers\Api\PushSubscriptionController;

use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\QzController;
use App\Http\Controllers\Api\RequirementController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\WhatsAppController;
use App\Http\Controllers\Api\ReminderController;
use App\Http\Controllers\Api\Staffing\StaffingCompanyController;
use App\Http\Controllers\Api\Staffing\StaffingCompanyPaymentController;
use App\Http\Controllers\Api\Staffing\StaffingCompanyRateController;
use App\Http\Controllers\Api\Staffing\StaffingInvoiceController;
use App\Http\Controllers\Api\Staffing\StaffingManualIncomeController;
use App\Http\Controllers\Api\Staffing\EmployeeAssetController;
use App\Http\Controllers\Api\Staffing\StaffingReportController;
use App\Http\Controllers\Api\Staffing\StaffingTaxEntityController;
use App\Http\Controllers\Api\Staffing\StaffingTaxEntryController;
use App\Http\Controllers\Api\Staffing\StaffingTimesheetController;
use App\Http\Controllers\Api\Staffing\StaffingWeeklyExpenseController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierPaymentController;
use App\Http\Controllers\Api\SuperadminController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\DailyReportController;

use Illuminate\Support\Facades\Route;

// Broadcasting auth (rate limited)
Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
    try {
        return \Illuminate\Support\Facades\Broadcast::auth($request);
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Broadcasting auth failed: ' . $e->getMessage(), [
            'channel' => $request->input('channel_name'),
            'socket_id' => $request->input('socket_id'),
        ]);
        return response()->json(['message' => 'Broadcasting auth temporarily unavailable'], 503);
    }
})->middleware('auth:sanctum', 'throttle:broadcasting');

// Auth (public — stricter rate limit)
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:auth');

// Public Booking (no auth required)
Route::prefix('public')->group(function () {
    Route::get('/business/{slug}', [PublicBookingController::class, 'business']);
    Route::get('/business/{slug}/employee/{employeeId}', [PublicBookingController::class, 'employee']);
    Route::get('/business/{slug}/services', [PublicBookingController::class, 'services']);
    Route::get('/business/{slug}/calendar/{employeeId}', [PublicBookingController::class, 'calendar']);
    Route::post('/business/{slug}/request', [PublicBookingController::class, 'request']);
});

// Protected routes
// 'business-context' (SetBusinessContext) must run AFTER auth:sanctum, not as global api
// middleware — it reads $request->user(), which isn't resolved yet at the point the global
// 'api' middleware group runs (that group wraps the whole file, sanctum auth is applied here,
// nested inside it). Running it globally left BusinessContext permanently unbound for every
// request; harmless for feature:/perm: (which fail OPEN when context is missing) but a hard
// 403 for capability: (which fails closed on purpose — see EnsureNicheCapability's docblock).
Route::middleware(['auth:sanctum', 'business-context'])->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    // Businesses
    Route::get('/businesses/{id}', [BusinessController::class, 'show']);
    Route::put('/businesses/{id}', [BusinessController::class, 'update']);

    // Branches
    Route::get('/branches', [BranchController::class, 'index']);
    Route::get('/branches/{id}', [BranchController::class, 'show']);
    Route::post('/branches', [BranchController::class, 'store']);
    Route::put('/branches/{id}', [BranchController::class, 'update']);
    Route::delete('/branches/{id}', [BranchController::class, 'destroy']);

    // Profiles / Employees
    Route::get('/profiles', [ProfileController::class, 'index']);
    Route::get('/profiles/{id}', [ProfileController::class, 'show']);
    Route::middleware('admin-panel')->group(function () {
        Route::post('/profiles', [ProfileController::class, 'store']);
        Route::put('/profiles/{id}', [ProfileController::class, 'update']);
        Route::delete('/profiles/{id}', [ProfileController::class, 'destroy']);
    });

    // QZ Tray (local print bridge) — signs/certifies print requests so it prints silently
    // instead of popping a "trust this app?" prompt on every ticket. See QzCertificateService.
    Route::get('/qz/certificate', [QzController::class, 'certificate']);
    Route::post('/qz/sign', [QzController::class, 'sign']);

    // Employee payments
    Route::get('/employee-payments', [EmployeePaymentController::class, 'index']);
    Route::post('/employee-payments', [EmployeePaymentController::class, 'store']);
    Route::put('/employee-payments/{id}', [EmployeePaymentController::class, 'update']);
    Route::delete('/employee-payments/{id}', [EmployeePaymentController::class, 'destroy']);

    // Employee commissions
    Route::get('/employee-commissions', [EmployeeCommissionController::class, 'index']);
    Route::get('/employee-debt', [EmployeeCommissionController::class, 'debt']);
    Route::get('/employee-balance/{employeeId}', [EmployeeCommissionController::class, 'balance']);
    Route::get('/employee-history/{employeeId}', [EmployeeCommissionController::class, 'history']);

    // Employee schedules
    Route::get('/employee-schedules', [EmployeeScheduleController::class, 'index']);
    Route::post('/employee-schedules', [EmployeeScheduleController::class, 'store']);
    Route::put('/employee-schedules/{id}', [EmployeeScheduleController::class, 'update']);
    Route::delete('/employee-schedules/{id}', [EmployeeScheduleController::class, 'destroy']);

    // Employee documents — scanned IDs, work letters, etc. attached to a profile. Staffing-only
    // for now (that's the only niche that asked for it) and admin-only in every direction
    // (including download): personal documents, never surfaced on the employee's own dashboard.
    Route::middleware(['capability:staffing.timesheets', 'admin-panel'])->group(function () {
        Route::get('/employee-documents', [EmployeeDocumentController::class, 'index']);
        Route::post('/employee-documents', [EmployeeDocumentController::class, 'store']);
        Route::delete('/employee-documents/{id}', [EmployeeDocumentController::class, 'destroy']);
        Route::get('/employee-documents/{id}/download', [EmployeeDocumentController::class, 'download']);
    });

    // Services
    Route::middleware('feature:servicios')->group(function () {
        Route::get('/services', [ServiceController::class, 'index']);
        Route::post('/services', [ServiceController::class, 'store']);
        Route::get('/services/{id}', [ServiceController::class, 'show']);
        Route::post('/services/categories/rename', [ServiceController::class, 'renameCategory']);
        Route::delete('/services/categories', [ServiceController::class, 'deleteCategory']);
        Route::put('/services/{id}', [ServiceController::class, 'update']);
        Route::delete('/services/{id}', [ServiceController::class, 'destroy']);
    });

    // Clients
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::put('/clients/{id}', [ClientController::class, 'update']);
    Route::delete('/clients/{id}', [ClientController::class, 'destroy']);
    Route::get('/clients/search', [ClientController::class, 'search']);
    Route::get('/clients/stats', [ClientController::class, 'stats']);
    Route::post('/clients/find-or-create-by-phone', [ClientController::class, 'findOrCreateByPhone']);
    Route::get('/clients/{id}', [ClientController::class, 'show']);
        Route::get('/clients/{id}/history', [ClientController::class, 'history']);
        Route::get('/clients/{clientId}/pets', [ClientController::class, 'pets']);
        Route::get('/clients/{clientId}/pets/{petId}/history', [AppointmentController::class, 'petHistory']);

        // Global Pets (Consultorio)
        Route::get('/pets', [PetController::class, 'index']);

        // Appointments
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::get('/appointments/{id}', [AppointmentController::class, 'show']);
    Route::put('/appointments/{id}', [AppointmentController::class, 'update']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);
    Route::patch('/appointments/{id}/status', [AppointmentController::class, 'updateStatus']);
    Route::patch('/appointments/{id}/time', [AppointmentController::class, 'updateTime']);

    // Products — read needs perm:inventory (tienda employee "acceso a inventario"),
    // write additionally needs perm:inventory-edit (disable_inventory_edit governs this).
    Route::middleware('feature:productos')->group(function () {
        Route::middleware('perm:inventory')->group(function () {
            Route::get('/products', [ProductController::class, 'index']);
            Route::get('/products/categories', [ProductCategoryController::class, 'index']);
            Route::get('/product-categories', [ProductCategoryController::class, 'index']);
        });
        Route::middleware('perm:inventory-edit')->group(function () {
            Route::post('/products', [ProductController::class, 'store']);
            Route::put('/products/{id}', [ProductController::class, 'update']);
            Route::delete('/products/{id}', [ProductController::class, 'destroy']);
            Route::post('/products/categories', [ProductCategoryController::class, 'store']);
            Route::post('/product-categories', [ProductCategoryController::class, 'store']);
        });
    });

    // Inventory (with dashes aliases for frontend compat) — same read/write split as Products.
    Route::middleware('feature:inventario')->group(function () {
        Route::middleware('perm:inventory')->group(function () {
            Route::get('/inventory', [InventoryController::class, 'index']);
            Route::get('/inventory-stock', [InventoryController::class, 'index']);
            Route::get('/inventory/movements', [InventoryController::class, 'movements']);
            Route::get('/inventory-movements', [InventoryController::class, 'movements']);
            Route::get('/inventory-locations', [InventoryController::class, 'locations']);
            Route::get('/product-variants', [InventoryController::class, 'variants']);
        });
        Route::middleware('perm:inventory-edit')->group(function () {
            Route::post('/inventory-stock', [InventoryController::class, 'storeStock']);
            Route::put('/inventory-stock/{id}', [InventoryController::class, 'updateStock']);
            Route::delete('/inventory-stock/{id}', [InventoryController::class, 'deleteStock']);
            Route::post('/inventory-movements', [InventoryController::class, 'storeMovement']);
            Route::delete('/inventory-movements/{id}', [InventoryController::class, 'destroyMovement']);
            Route::post('/inventory/adjust', [InventoryController::class, 'adjust']);
            Route::post('/inventory/sell', [InventoryController::class, 'sell']);
            Route::post('/inventory-locations', [InventoryController::class, 'storeLocation']);
        });
    });

    // Requirements (Fallas/Faltantes)
    Route::middleware('perm:requirements')->group(function () {
        Route::get('/requirements', [RequirementController::class, 'index']);
        Route::post('/requirements', [RequirementController::class, 'store']);
        Route::put('/requirements/{id}', [RequirementController::class, 'update']);
        Route::patch('/requirements/{id}/status', [RequirementController::class, 'updateStatus']);
        Route::delete('/requirements/{id}', [RequirementController::class, 'destroy']);
    });

    // Suppliers — whole module gated on a single perm (no separate view/edit split requested).
    Route::middleware(['feature:proveedores', 'perm:suppliers'])->group(function () {
        Route::get('/suppliers', [SupplierController::class, 'index']);
        Route::post('/suppliers', [SupplierController::class, 'store']);
        Route::put('/suppliers/{id}', [SupplierController::class, 'update']);
        Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy']);
        Route::get('/suppliers/balance/{id}', [SupplierController::class, 'balance']);

        // Supplier payments
        Route::get('/supplier-payments', [SupplierPaymentController::class, 'index']);
        Route::post('/supplier-payments', [SupplierPaymentController::class, 'store']);
        Route::delete('/supplier-payments/{id}', [SupplierPaymentController::class, 'destroy']);
    });

    // Staffing — client companies and their per-role rate card.
    // `capability:` (unlike feature:/perm:) blocks for real regardless of FEATURE_GATE_ENFORCE,
    // so these endpoints are unreachable from any niche other than staffing. `admin-panel`
    // keeps them out of employee hands — staffing workers have no login at all.
    Route::middleware(['capability:staffing.timesheets', 'admin-panel'])->group(function () {
        Route::get('/staffing-companies', [StaffingCompanyController::class, 'index']);
        Route::post('/staffing-companies', [StaffingCompanyController::class, 'store']);
        Route::put('/staffing-companies/{id}', [StaffingCompanyController::class, 'update']);
        Route::delete('/staffing-companies/{id}', [StaffingCompanyController::class, 'destroy']);

        Route::get('/staffing-company-rates', [StaffingCompanyRateController::class, 'index']);
        Route::post('/staffing-company-rates', [StaffingCompanyRateController::class, 'store']);
        Route::put('/staffing-company-rates/{id}', [StaffingCompanyRateController::class, 'update']);
        Route::delete('/staffing-company-rates/{id}', [StaffingCompanyRateController::class, 'destroy']);

        Route::get('/staffing-companies/{companyId}/employees', [StaffingTimesheetController::class, 'employeesForCompany']);
        // Year-wide weekly headcount matrix for the Empresas status tabs — must be registered
        // before {companyId} routes would otherwise be ambiguous; it isn't (different shapes),
        // but keeping it next to them documents the relationship.
        Route::get('/staffing-companies/headcount-matrix', [StaffingReportController::class, 'headcountMatrix']);
        Route::get('/staffing-timesheets', [StaffingTimesheetController::class, 'index']);
        Route::post('/staffing-timesheets', [StaffingTimesheetController::class, 'store']);
        Route::post('/staffing-timesheets/{id}/approve', [StaffingTimesheetController::class, 'approve']);
        Route::post('/staffing-timesheets/{id}/mark-paid', [StaffingTimesheetController::class, 'markPaid']);
        Route::delete('/staffing-timesheets/{id}', [StaffingTimesheetController::class, 'destroy']);
    });

    // Staffing — invoices billed to client companies and the payments (abonos) against them.
    Route::middleware(['capability:staffing.billing', 'admin-panel'])->group(function () {
        Route::get('/staffing-invoices', [StaffingInvoiceController::class, 'index']);
        Route::get('/staffing-invoices/{id}', [StaffingInvoiceController::class, 'show']);
        Route::post('/staffing-invoices/generate', [StaffingInvoiceController::class, 'generate']);
        Route::delete('/staffing-invoices/{id}', [StaffingInvoiceController::class, 'destroy']);
        Route::get('/staffing-companies/{companyId}/balance', [StaffingInvoiceController::class, 'balance']);

        Route::get('/staffing-company-payments', [StaffingCompanyPaymentController::class, 'index']);
        Route::post('/staffing-company-payments', [StaffingCompanyPaymentController::class, 'store']);
        Route::delete('/staffing-company-payments/{id}', [StaffingCompanyPaymentController::class, 'destroy']);
    });

    // Staffing — the reports module (distinct from the salon-side daily-report module): monthly
    // and weekly financial summaries across all of a business's client companies.
    Route::middleware(['capability:staffing.reports', 'admin-panel'])->group(function () {
        Route::get('/staffing-reports/monthly-payroll', [StaffingReportController::class, 'monthlyPayroll']);
        Route::get('/staffing-reports/weekly', [StaffingReportController::class, 'weeklyReport']);
        // The "lista de depósitos" — every direct-deposit payout due for an approved/paid week,
        // across every client company, to guide the bank run.
        Route::get('/staffing-reports/deposit-list', [StaffingReportController::class, 'depositList']);
        Route::get('/staffing-reports/employee-hours', [StaffingReportController::class, 'employeeHours']);
        Route::get('/staffing-reports/company-hours', [StaffingReportController::class, 'companyHours']);
        Route::post('/staffing-weekly-expenses', [StaffingWeeklyExpenseController::class, 'store']);

        // Finanzas > Resumen for staffing: invoiced-hours/employer-cost/margin summary, plus the
        // manual income entries that sit alongside it.
        Route::get('/staffing-reports/finance-summary', [StaffingReportController::class, 'financeSummary']);
        Route::get('/staffing-manual-incomes', [StaffingManualIncomeController::class, 'index']);
        Route::post('/staffing-manual-incomes', [StaffingManualIncomeController::class, 'store']);
        Route::delete('/staffing-manual-incomes/{id}', [StaffingManualIncomeController::class, 'destroy']);

        Route::get('/staffing-reports/annual-tax', [StaffingReportController::class, 'annualTaxReport']);
        Route::get('/staffing-tax-entities', [StaffingTaxEntityController::class, 'index']);
        Route::post('/staffing-tax-entities', [StaffingTaxEntityController::class, 'store']);
        Route::put('/staffing-tax-entities/{id}', [StaffingTaxEntityController::class, 'update']);
        Route::delete('/staffing-tax-entities/{id}', [StaffingTaxEntityController::class, 'destroy']);

        Route::get('/staffing-tax-entries', [StaffingTaxEntryController::class, 'index']);
        // Multipart upsert — see StaffingTaxEntryController::store(). Kept as POST-only rather
        // than also exposing PUT: the (employee, entity, year) key already makes this idempotent.
        Route::post('/staffing-tax-entries', [StaffingTaxEntryController::class, 'store']);
        Route::delete('/staffing-tax-entries/{id}', [StaffingTaxEntryController::class, 'destroy']);
        // Never served from a public disk/URL — see the controller docblock.
        Route::get('/staffing-tax-entries/{id}/download', [StaffingTaxEntryController::class, 'download']);
    });

    // Staffing CRM — leads registered by sales reps. No `admin-panel` here on purpose: a plain
    // 'empleado' (the vendedora) must reach these routes, unlike every other staffing group
    // above which is admin-only. Privacy (a vendedora sees only her own leads) is enforced in
    // LeadService, not by keeping non-admins out of the route.
    Route::middleware(['capability:staffing.crm'])->group(function () {
        Route::get('/leads', [LeadController::class, 'index']);
        Route::post('/leads', [LeadController::class, 'store']);
        Route::put('/leads/{id}', [LeadController::class, 'update']);
        Route::delete('/leads/{id}', [LeadController::class, 'destroy']);
        // Admin-only sidebar roster — checked inside the controller, same pattern as index().
        Route::get('/leads/vendedoras', [LeadController::class, 'vendedoras']);
    });

    // Staffing CRM — admin-only vendedor management: the material assets (vehicle, phone, etc.)
    // assigned to them. Unlike the /leads group above, this IS admin-panel-gated — a vendedor
    // manages her own leads but shouldn't reassign her own gear.
    Route::middleware(['capability:staffing.crm', 'admin-panel'])->group(function () {
        Route::get('/employee-assets', [EmployeeAssetController::class, 'index']);
        Route::post('/employee-assets', [EmployeeAssetController::class, 'store']);
        Route::put('/employee-assets/{id}', [EmployeeAssetController::class, 'update']);
        Route::delete('/employee-assets/{id}', [EmployeeAssetController::class, 'destroy']);
    });

    // Finanzas
    Route::get('/finanzas/summary', [FinancialSummaryController::class, 'summary']);
    Route::get('/finanzas/transactions', [FinancialSummaryController::class, 'transactions']);
    Route::get('/finanzas/product-sales', [FinancialSummaryController::class, 'productSales']);

    // Transactions
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::put('/transactions/{id}', [TransactionController::class, 'update']);
    Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);

    Route::get('/credits', [CreditController::class, 'index']);
    Route::post('/credits/{id}/mark-paid', [CreditController::class, 'markPaid']);

    // Expenses
    Route::get('/expenses', [ExpenseController::class, 'index']);
    Route::post('/expenses', [ExpenseController::class, 'store']);
    Route::put('/expenses/{id}', [ExpenseController::class, 'update']);
    Route::delete('/expenses/{id}', [ExpenseController::class, 'destroy']);

    // Daily Reports
    Route::get('/daily-reports', [DailyReportController::class, 'index']);
    // Antes de la ruta con {id} no hace falta cuidado: no colisionan, pero se
    // deja agrupada con el resto del recurso.
    Route::get('/daily-reports/pos-summary', [DailyReportController::class, 'posSummary']);
    Route::get('/daily-reports/dashboard-summary', [DailyReportController::class, 'dashboardSummary']);
    Route::post('/daily-reports', [DailyReportController::class, 'store']);
    Route::put('/daily-reports/{id}', [DailyReportController::class, 'update']);
    Route::delete('/daily-reports/{id}', [DailyReportController::class, 'destroy']);

    // POS
    Route::middleware(['feature:pos', 'perm:pos'])->group(function () {
        Route::get('/pos/pending', [PosController::class, 'pendingAppointments']);
        Route::get('/pos/products', [PosController::class, 'saleableProducts']);
        Route::post('/pos/sale', [PosController::class, 'recordSale']);
        Route::post('/pos/direct-sale', [PosController::class, 'directSale']);
        Route::post('/pos/direct-service-sale', [PosController::class, 'directServiceSale']);
    });

    // Gift Cards
    Route::middleware('feature:gift_cards')->group(function () {
        Route::get('/gift-cards', [GiftCardController::class, 'index']);
        Route::post('/gift-cards', [GiftCardController::class, 'store']);
        Route::put('/gift-cards/{id}', [GiftCardController::class, 'update']);
        Route::delete('/gift-cards/{id}', [GiftCardController::class, 'destroy']);
    });

    // Push subscriptions
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store']);
    Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'dismiss']);

    // Reminders (admin-only manual trigger for testing)
    Route::post('/reminders/trigger', [ReminderController::class, 'trigger']);

    // WhatsApp
    Route::get('/whatsapp/config', [WhatsAppController::class, 'config']);
    Route::put('/whatsapp/config', [WhatsAppController::class, 'updateConfig']);
    Route::post('/whatsapp/instance', [WhatsAppController::class, 'createInstance']);
    Route::get('/whatsapp/qr', [WhatsAppController::class, 'qrCode']);
    Route::get('/whatsapp/status', [WhatsAppController::class, 'status']);
    Route::post('/whatsapp/disconnect', [WhatsAppController::class, 'disconnect']);
    Route::post('/whatsapp/test', [WhatsAppController::class, 'sendTest']);
    Route::get('/whatsapp/templates', [WhatsAppController::class, 'templates']);
    Route::post('/whatsapp/templates', [WhatsAppController::class, 'saveTemplate']);
    Route::delete('/whatsapp/templates/{id}', [WhatsAppController::class, 'deleteTemplate']);
    Route::get('/whatsapp/variables', [WhatsAppController::class, 'variables']);

    // Superadmin only
    Route::middleware('superadmin')->prefix('admin')->group(function () {
        Route::get('/businesses', [SuperadminController::class, 'businesses']);
        Route::post('/businesses', [SuperadminController::class, 'store']);
        Route::put('/businesses/{id}', [SuperadminController::class, 'update']);
        Route::delete('/businesses/{id}', [SuperadminController::class, 'destroy']);
        Route::post('/businesses/{id}/suspend', [SuperadminController::class, 'suspend']);
        Route::post('/businesses/{id}/resume', [SuperadminController::class, 'resume']);
        Route::get('/businesses/{id}/admins', [SuperadminController::class, 'admins']);
        Route::put('/businesses/{id}/admins/{profileId}/password', [SuperadminController::class, 'resetAdminPassword']);
        Route::post('/businesses/{id}/admins/{profileId}/impersonate', [SuperadminController::class, 'impersonate']);
        Route::get('/businesses/{id}/audit-logs', [SuperadminController::class, 'auditLogs']);
        Route::get('/audit-logs', [SuperadminController::class, 'globalAuditLogs']);
        Route::get('/superadmins', [SuperadminController::class, 'superadmins']);
        Route::post('/superadmins', [SuperadminController::class, 'storeSuperadmin']);
        Route::post('/superadmins/{id}/revoke', [SuperadminController::class, 'revokeSuperadmin']);
        Route::post('/superadmins/{id}/restore', [SuperadminController::class, 'restoreSuperadmin']);
        Route::get('/features-matrix', [SuperadminController::class, 'featuresMatrix']);
    });
});
