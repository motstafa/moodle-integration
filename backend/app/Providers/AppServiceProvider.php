<?php

namespace App\Providers;

use App\Services\Moodle\CourseAggregator;
use App\Services\Moodle\MoodleClient;
use App\Services\Moodle\UserAggregator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(MoodleClient::class, function () {
            return new MoodleClient(
                url:   config('services.moodle.url'),
                token: config('services.moodle.token'),
            );
        });

        $this->app->singleton(UserAggregator::class, function ($app) {
            return new UserAggregator($app->make(MoodleClient::class));
        });

        $this->app->singleton(CourseAggregator::class, function ($app) {
            return new CourseAggregator($app->make(MoodleClient::class));
        });
    }

    public function boot(): void {}
}
