<?php

use App\Exceptions\NotFoundException;
use App\Services\Moodle\MoodleApiException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {

        // Moodle returned an application-level error (HTTP 200 but exception in body).
        $exceptions->render(function (MoodleApiException $e, Request $request) {
            if ($request->expectsJson()) {
                $code = match ($e->moodleErrorCode()) {
                    'invalidtoken', 'serviceaccessexception', 'accessdenied' => 'MOODLE_PERMISSION_DENIED',
                    'invalidparameter'                                        => 'MOODLE_INVALID_PARAMETER',
                    'nosuchuser'                                              => 'USER_NOT_FOUND',
                    'invalid_response'                                        => 'MOODLE_UNREACHABLE',
                    default                                                   => 'MOODLE_ERROR',
                };
                return response()->json([
                    'ok'    => false,
                    'error' => ['code' => $code, 'message' => $e->getMessage()],
                ], 502);
            }
        });

        // Could not reach the Moodle server at all.
        $exceptions->render(function (ConnectionException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'ok'    => false,
                    'error' => [
                        'code'    => 'MOODLE_UNREACHABLE',
                        'message' => 'Could not connect to the Moodle server. Check MOODLE_URL in .env.',
                    ],
                ], 502);
            }
        });

        // User or course not found in Moodle.
        $exceptions->render(function (NotFoundException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'ok'    => false,
                    'error' => ['code' => 'NOT_FOUND', 'message' => $e->getMessage()],
                ], 404);
            }
        });

        // Laravel validation failed.
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->expectsJson()) {
                $first = collect($e->errors())->flatten()->first();
                return response()->json([
                    'ok'    => false,
                    'error' => ['code' => 'VALIDATION_ERROR', 'message' => $first],
                ], 422);
            }
        });

        // Route not matched (e.g. /api/users/abc fails whereNumber).
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'ok'    => false,
                    'error' => ['code' => 'NOT_FOUND', 'message' => 'The requested endpoint does not exist.'],
                ], 404);
            }
        });

        // Catch-all: any unhandled exception in an API request becomes a standard error response.
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->expectsJson()) {
                Log::channel('single')->error('Unhandled exception in API route', [
                    'exception' => get_class($e),
                    'message'   => $e->getMessage(),
                    'file'      => $e->getFile(),
                    'line'      => $e->getLine(),
                ]);
                return response()->json([
                    'ok'    => false,
                    'error' => ['code' => 'INTERNAL_ERROR', 'message' => 'An unexpected error occurred.'],
                ], 500);
            }
        });

    })->create();
