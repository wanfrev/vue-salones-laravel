<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\EmployeeBalanceController;
use App\Http\Controllers\Api\EmployeeCommissionController;
use App\Http\Controllers\Api\EmployeePaymentController;
use App\Http\Controllers\Api\EmployeeScheduleController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\FinancialSummaryController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\SuperadminController;
use Illuminate\Support\Facades\Route;

// Auth (public)
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

    // Businesses
    Route::get('/businesses/{id}', [BusinessController::class, 'show']);
    Route::put('/businesses/{id}', [BusinessController::class, 'update']);

    // Branches (scoped to user's business)
    Route::get('/branches', [BranchController::class, 'index']);
    Route::post('/branches', [BranchController::class, 'store']);
    Route::put('/branches/{id}', [BranchController::class, 'update']);
    Route::delete('/branches/{id}', [BranchController::class, 'destroy']);

    // Employee schedules
    Route::get('/employee-schedules', [EmployeeScheduleController::class, 'index']);

    // Profiles / Employees (scoped to business)
    Route::get('/profiles', [ProfileController::class, 'index']);
    Route::post('/profiles', [ProfileController::class, 'store']);
    Route::put('/profiles/{id}', [ProfileController::class, 'update']);
    Route::delete('/profiles/{id}', [ProfileController::class, 'destroy']);

    // Employee payments (scoped to business)
    Route::get('/employee-payments', [EmployeePaymentController::class, 'index']);
    Route::post('/employee-payments', [EmployeePaymentController::class, 'store']);
    Route::put('/employee-payments/{id}', [EmployeePaymentController::class, 'update']);
    Route::delete('/employee-payments/{id}', [EmployeePaymentController::class, 'destroy']);

    // Employee balance
    Route::get('/employee-balance/{employeeId}', [EmployeeBalanceController::class, 'show']);

    // Employee commissions / earnings summary
    Route::get('/employee-commissions', [EmployeeCommissionController::class, 'index']);

    // Transactions (for financial summary, employee tabs)
    Route::get('/transactions', [TransactionController::class, 'index']);

    // RPC endpoints (supabase compatibility)
    Route::post('/rpc/financial-summary', FinancialSummaryController::class);

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
