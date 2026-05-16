<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Moodle Web Services
    |--------------------------------------------------------------------------
    |
    | MOODLE_URL   — base URL of the Moodle instance, no trailing slash.
    | MOODLE_TOKEN — web service token; NEVER exposed to the browser.
    | MOODLE_CACHE_TTL — seconds to cache Moodle responses (default 600).
    |
    */
    'moodle' => [
        'url'       => env('MOODLE_URL'),
        'token'     => env('MOODLE_TOKEN'),
        'cache_ttl' => (int) env('MOODLE_CACHE_TTL', 600),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cache Flush Shared Secret
    |--------------------------------------------------------------------------
    | Used by POST /api/cache/flush to prevent unauthenticated cache clears.
    | Set REFRESH_SECRET to a long random string in .env.
    */
    'refresh_secret' => env('REFRESH_SECRET'),

];
