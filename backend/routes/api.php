<?php

use App\Http\Controllers\Api\CacheFlushController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\UserProfileController;
use App\Http\Controllers\Api\UserSearchController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Moodle Admin Portal — API Routes
|--------------------------------------------------------------------------
|
| All routes proxy requests to Moodle Web Services. The token lives in
| .env on this server and is NEVER exposed to the browser or any response.
|
*/

Route::get('/users/search', UserSearchController::class);
Route::get('/users/{id}',   UserProfileController::class);
Route::get('/courses/{id}', CourseController::class);

Route::post('/cache/flush', CacheFlushController::class);
