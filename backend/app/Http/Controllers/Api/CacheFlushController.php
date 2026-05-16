<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\RespondsWithJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * POST /api/cache/flush
 *
 * Accepts JSON body: { "scope": "all" | "user:{id}" | "course:{id}" }
 * Requires header:   X-Refresh-Token: <REFRESH_SECRET from .env>
 *
 * Scoped flush keys:
 *   user:{id}   → moodle:users:{id}
 *   course:{id} → moodle:courses:{id} + moodle:courses:{id}:enrolled
 *   all         → entire file cache (Cache::flush())
 */
class CacheFlushController extends Controller
{
    use RespondsWithJson;

    public function __invoke(Request $request): JsonResponse
    {
        $secret = config('services.refresh_secret');

        if (!$secret || $request->header('X-Refresh-Token') !== $secret) {
            return $this->fail('UNAUTHORIZED', 'Invalid or missing X-Refresh-Token header.', 401);
        }

        $request->validate([
            'scope' => ['required', 'string', 'regex:/^(all|users?:\d+|courses?:\d+)$/'],
        ]);

        $scope   = $request->input('scope');
        $flushed = [];

        if ($scope === 'all') {
            Cache::flush();
            $flushed = ['*'];
        } elseif (preg_match('/^users?:(\d+)$/', $scope, $m)) {
            $keys = ["moodle:users:{$m[1]}"];
            foreach ($keys as $k) {
                Cache::forget($k);
                $flushed[] = $k;
            }
        } elseif (preg_match('/^courses?:(\d+)$/', $scope, $m)) {
            $keys = [
                "moodle:courses:{$m[1]}",
                "moodle:courses:{$m[1]}:enrolled",
            ];
            foreach ($keys as $k) {
                Cache::forget($k);
                $flushed[] = $k;
            }
        }

        return $this->ok(['flushed' => $flushed], false, now()->toIso8601String());
    }
}
