<?php

namespace App\Http\Traits;

use Illuminate\Http\JsonResponse;

/**
 * Enforces the consistent response envelope for all API endpoints:
 *
 * Success: { ok: true,  data: ...,               cached: bool, cached_at: ISO8601 }
 * Error:   { ok: false, error: { code, message }                                  }
 */
trait RespondsWithJson
{
    protected function ok(mixed $data, bool $cached, string $cachedAt): JsonResponse
    {
        return response()->json([
            'ok'        => true,
            'data'      => $data,
            'cached'    => $cached,
            'cached_at' => $cachedAt,
        ]);
    }

    protected function fail(string $code, string $message, int $status = 400): JsonResponse
    {
        return response()->json([
            'ok'    => false,
            'error' => [
                'code'    => $code,
                'message' => $message,
            ],
        ], $status);
    }
}
