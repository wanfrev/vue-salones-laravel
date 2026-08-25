<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            $user = $request->user();
            return $user
                ? Limit::perMinute(120)->by($user->id)
                : Limit::perMinute(60)->by($request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('broadcasting', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(30)->by($request->user()->id)
                : Limit::perMinute(5)->by($request->ip());
        });

        // La app autentica con Bearer tokens en localStorage, que una navegación de
        // navegador normal a /pulse nunca envía — Auth::user() siempre es null aquí.
        // El control de acceso real es el auth_basic de nginx delante de esta ruta.
        Gate::define('viewPulse', fn ($user = null) => true);
    }
}
