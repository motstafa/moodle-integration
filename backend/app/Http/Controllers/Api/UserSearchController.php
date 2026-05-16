<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\RespondsWithJson;
use App\Services\Moodle\MoodleClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class UserSearchController extends Controller
{
    use RespondsWithJson;

    private const TTL = 120;

    public function __construct(private readonly MoodleClient $client) {}

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['q' => 'required|string|min:2|max:100']);

        $q        = $request->input('q');
        $cacheKey = 'moodle:search:' . md5($q);
        $isCached = Cache::has($cacheKey);
        Log::channel('single')->info('Cache ' . ($isCached ? 'HIT' : 'MISS') . ": {$cacheKey}");

        $entry = Cache::remember($cacheKey, self::TTL, function () use ($q) {
            $users = $this->client->searchUsers([
                ['key' => 'fullname', 'value' => '%' . $q . '%'],
            ]);

            return ['data' => $users, 'cached_at' => now()->toIso8601String()];
        });

        return $this->ok($entry['data'], $isCached, $entry['cached_at']);
    }
}
