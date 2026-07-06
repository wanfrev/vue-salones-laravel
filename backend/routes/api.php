<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessController;
use Illuminate\Support\Facades\Route;

// Auth (public)
Route::post('/auth/login', [AuthController::class, 'login']);

// Auth (protected)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

    // Businesses
    Route::get('/businesses/{id}', [BusinessController::class, 'show']);
});
