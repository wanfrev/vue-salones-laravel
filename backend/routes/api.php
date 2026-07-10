<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\EmployeeBalanceController;
use App\Http\Controllers\Api\EmployeeCommissionController;
use App\Http\Controllers\Api\EmployeePaymentController;
use App\Http\Controllers\Api\EmployeeScheduleController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FinancialSummaryController;

use App\Http\Controllers\Api\GiftCardController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PosController;

use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierPaymentController;
use App\Http\Controllers\Api\SuperadminController;
use App\Http\Controllers\Api\TransactionController;

use Illuminate\Support\Facades\Route;

// Broadcasting auth (rate limited)
Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
    return \Illuminate\Support\Facades\Broadcast::auth($request);
})->middleware('auth:sanctum', 'throttle:broadcasting');

// Auth (public — stricter rate limit)
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:auth');

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

    // Businesses
    Route::get('/businesses/{id}', [BusinessController::class, 'show']);
    Route::put('/businesses/{id}', [BusinessController::class, 'update']);

    // Branches
    Route::get('/branches', [BranchController::class, 'index']);
    Route::post('/branches', [BranchController::class, 'store']);
    Route::put('/branches/{id}', [BranchController::class, 'update']);
    Route::delete('/branches/{id}', [BranchController::class, 'destroy']);

    // Employee schedules
    Route::get('/employee-schedules', [EmployeeScheduleController::class, 'index']);
    Route::post('/employee-schedules', [EmployeeScheduleController::class, 'store']);
    Route::put('/employee-schedules/{id}', [EmployeeScheduleController::class, 'update']);
    Route::delete('/employee-schedules/{id}', [EmployeeScheduleController::class, 'destroy']);

    // Profiles / Employees
    Route::get('/profiles', [ProfileController::class, 'index']);
    Route::get('/profiles/{id}', [ProfileController::class, 'show']);
    Route::post('/profiles', [ProfileController::class, 'store']);
    Route::put('/profiles/{id}', [ProfileController::class, 'update']);
    Route::delete('/profiles/{id}', [ProfileController::class, 'destroy']);

    // Employee payments
    Route::get('/employee-payments', [EmployeePaymentController::class, 'index']);
    Route::post('/employee-payments', [EmployeePaymentController::class, 'store']);
    Route::put('/employee-payments/{id}', [EmployeePaymentController::class, 'update']);
    Route::delete('/employee-payments/{id}', [EmployeePaymentController::class, 'destroy']);

    // Employee balance
    Route::get('/employee-balance/{employeeId}', [EmployeeBalanceController::class, 'show']);

    // Employee commissions
    Route::get('/employee-commissions', [EmployeeCommissionController::class, 'index']);

    // Services
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store']);
    Route::get('/services/{id}', [ServiceController::class, 'show']);
    Route::post('/services/categories/rename', [ServiceController::class, 'renameCategory']);
    Route::delete('/services/categories', [ServiceController::class, 'deleteCategory']);
    Route::put('/services/{id}', [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);

    // Clients
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::put('/clients/{id}', [ClientController::class, 'update']);
    Route::delete('/clients/{id}', [ClientController::class, 'destroy']);
    Route::get('/clients/search', [ClientController::class, 'search']);
    Route::post('/clients/find-or-create-by-phone', [ClientController::class, 'findOrCreateByPhone']);
    Route::get('/clients/{id}/history', [ClientController::class, 'history']);

    // Appointments
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::get('/appointments/{id}', [AppointmentController::class, 'show']);
    Route::put('/appointments/{id}', [AppointmentController::class, 'update']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);
    Route::patch('/appointments/{id}/status', [AppointmentController::class, 'updateStatus']);
    Route::patch('/appointments/{id}/time', [AppointmentController::class, 'updateTime']);

    // Products
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Product categories
    Route::get('/products/categories', [ProductCategoryController::class, 'index']);
    Route::post('/products/categories', [ProductCategoryController::class, 'store']);
    Route::get('/product-categories', [ProductCategoryController::class, 'index']);
    Route::post('/product-categories', [ProductCategoryController::class, 'store']);

    // Inventory (with dashes aliases for frontend compat)
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory-stock', [InventoryController::class, 'index']);
    Route::post('/inventory-stock', [InventoryController::class, 'storeStock']);
    Route::put('/inventory-stock/{id}', [InventoryController::class, 'updateStock']);
    Route::delete('/inventory-stock/{id}', [InventoryController::class, 'deleteStock']);
    Route::get('/inventory/movements', [InventoryController::class, 'movements']);
    Route::get('/inventory-movements', [InventoryController::class, 'movements']);
    Route::post('/inventory-movements', [InventoryController::class, 'storeMovement']);
    Route::post('/inventory/adjust', [InventoryController::class, 'adjust']);
    Route::post('/inventory/sell', [InventoryController::class, 'sell']);
    Route::get('/inventory-locations', [InventoryController::class, 'locations']);
    Route::post('/inventory-locations', [InventoryController::class, 'storeLocation']);
    Route::get('/product-variants', [InventoryController::class, 'variants']);

    // Suppliers
    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::post('/suppliers', [SupplierController::class, 'store']);
    Route::put('/suppliers/{id}', [SupplierController::class, 'update']);
    Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy']);
    Route::get('/suppliers/balance/{id}', [SupplierController::class, 'balance']);

    // Supplier payments
    Route::get('/supplier-payments', [SupplierPaymentController::class, 'index']);
    Route::post('/supplier-payments', [SupplierPaymentController::class, 'store']);
    Route::delete('/supplier-payments/{id}', [SupplierPaymentController::class, 'destroy']);

    // Finanzas
    Route::get('/finanzas/summary', [FinancialSummaryController::class, 'summary']);
    Route::get('/finanzas/transactions', [FinancialSummaryController::class, 'transactions']);
    Route::get('/finanzas/product-sales', [FinancialSummaryController::class, 'productSales']);

    // Transactions
    Route::put('/transactions/{id}', [TransactionController::class, 'update']);
    Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);

    // Expenses
    Route::get('/expenses', [ExpenseController::class, 'index']);
    Route::post('/expenses', [ExpenseController::class, 'store']);
    Route::put('/expenses/{id}', [ExpenseController::class, 'update']);
    Route::delete('/expenses/{id}', [ExpenseController::class, 'destroy']);

    // POS
    Route::get('/pos/pending', [PosController::class, 'pendingAppointments']);
    Route::get('/pos/products', [PosController::class, 'saleableProducts']);
    Route::post('/pos/sale', [PosController::class, 'recordSale']);
    Route::post('/pos/direct-sale', [PosController::class, 'directSale']);

    // Gift Cards
    Route::get('/gift-cards', [GiftCardController::class, 'index']);
    Route::post('/gift-cards', [GiftCardController::class, 'store']);
    Route::put('/gift-cards/{id}', [GiftCardController::class, 'update']);
    Route::delete('/gift-cards/{id}', [GiftCardController::class, 'destroy']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'dismiss']);

    // Superadmin only
    Route::middleware('superadmin')->prefix('admin')->group(function () {
        Route::get('/businesses', [SuperadminController::class, 'businesses']);
        Route::post('/businesses', [SuperadminController::class, 'store']);
        Route::put('/businesses/{id}', [SuperadminController::class, 'update']);
        Route::delete('/businesses/{id}', [SuperadminController::class, 'destroy']);
        Route::post('/businesses/{id}/suspend', [SuperadminController::class, 'suspend']);
        Route::post('/businesses/{id}/resume', [SuperadminController::class, 'resume']);
        Route::get('/businesses/{id}/admins', [SuperadminController::class, 'admins']);
    });
});
