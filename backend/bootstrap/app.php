<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \App\Http\Middleware\UnwrapApiData::class,
            \App\Http\Middleware\ParseApiFilters::class,
        ]);
        // SetBusinessContext moved out of this global group — it needs $request->user(),
        // which isn't resolved yet at this point in the pipeline (auth:sanctum runs later,
        // nested inside routes/api.php). It's now applied explicitly via the 'business-context'
        // alias on the protected route group instead. See routes/api.php for the full story.
        $middleware->alias([
            'superadmin' => \App\Http\Middleware\EnsureSuperadmin::class,
            'admin-panel' => \App\Http\Middleware\EnsureAdminPanelRole::class,
            'business-context' => \App\Http\Middleware\SetBusinessContext::class,
            'feature' => \App\Http\Middleware\EnsureBusinessFeature::class,
            'perm' => \App\Http\Middleware\EnsureProfilePermission::class,
            // Unlike feature/perm above, this one blocks for real — see the class docblock.
            'capability' => \App\Http\Middleware\EnsureNicheCapability::class,
        ]);
        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
