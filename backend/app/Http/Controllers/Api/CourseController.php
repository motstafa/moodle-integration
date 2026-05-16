<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\RespondsWithJson;
use App\Services\Moodle\CourseAggregator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CourseController extends Controller
{
    use RespondsWithJson;

    private const TTL = 900;

    public function __construct(private readonly CourseAggregator $aggregator) {}

    public function __invoke(Request $request, string $id): JsonResponse
    {
        $courseId = (int) $id;
        if ($courseId < 1) {
            return $this->fail('INVALID_ID', 'Course ID must be a positive integer.', 422);
        }

        $cacheKey = "moodle:courses:{$courseId}";
        $isCached = Cache::has($cacheKey);
        Log::channel('single')->info('Cache ' . ($isCached ? 'HIT' : 'MISS') . ": {$cacheKey}");

        $entry = Cache::remember($cacheKey, self::TTL, function () use ($courseId) {
            return [
                'data'      => $this->aggregator->build($courseId),
                'cached_at' => now()->toIso8601String(),
            ];
        });

        return $this->ok($entry['data'], $isCached, $entry['cached_at']);
    }
}
