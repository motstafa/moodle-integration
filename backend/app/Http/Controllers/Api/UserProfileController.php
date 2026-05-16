<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\RespondsWithJson;
use App\Services\Moodle\UserAggregator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class UserProfileController extends Controller
{
    use RespondsWithJson;

    private const TTL = 600;

    public function __construct(private readonly UserAggregator $aggregator) {}

    public function __invoke(Request $request, string $id): JsonResponse
    {
        $userId = (int) $id;
        if ($userId < 1) {
            return $this->fail('INVALID_ID', 'User ID must be a positive integer.', 422);
        }

        $cacheKey = "moodle:users:{$userId}";
        $isCached = Cache::has($cacheKey);
        Log::channel('single')->info('Cache ' . ($isCached ? 'HIT' : 'MISS') . ": {$cacheKey}");

        $entry = Cache::remember($cacheKey, self::TTL, function () use ($userId) {
            return [
                'data'      => $this->aggregator->build($userId),
                'cached_at' => now()->toIso8601String(),
            ];
        });

        return $this->ok($entry['data'], $isCached, $entry['cached_at']);
    }
}
