<?php

namespace App\Http\Controllers\Api;

use App\Console\Commands\GenerateReminders;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class ReminderController
{
    /**
     * Manually trigger reminder generation.
     * Useful for testing and debugging the notification system.
     */
    public function trigger(Request $request): JsonResponse
    {
        $profile = $request->user()?->profile;
        if (!$profile || !in_array($profile->role, ['admin', 'superadmin'])) {
            return response()->json(['error' => ['message' => 'No autorizado. Solo administradores pueden disparar recordatorios.']], 403);
        }

        $debug = $request->boolean('debug', false);

        $exitCode = Artisan::call('reminders:generate', $debug ? ['--debug' => true] : []);
        $output = Artisan::output();

        return response()->json([
            'success' => $exitCode === 0,
            'exit_code' => $exitCode,
            'output' => explode("\n", trim($output)),
        ]);
    }
}
