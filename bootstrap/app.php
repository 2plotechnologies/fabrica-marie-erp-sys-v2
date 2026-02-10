<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        //api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        $middleware->validateCsrfTokens(except: [
            '/login',
        ]);

         /*
        $middleware->group('api', [
                // 🔴 NO throttle aquí
                \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ]);

         $middleware->api([
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            // Other middleware...
        ]);

         RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?: $request->ip()
            );
        });
        */
        $middleware->alias([
            'permiso' => \App\Http\Middleware\CheckPermiso::class,
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);

        $middleware->api([
            EnsureFrontendRequestsAreStateful::class,
            'throttle:api',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
