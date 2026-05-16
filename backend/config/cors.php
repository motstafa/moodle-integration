<?php

return [
    'paths'                    => ['api/*'],
    'allowed_methods'          => ['GET', 'POST'],
    'allowed_origins'          => [env('FRONTEND_URL', 'http://localhost:3000')],
    'allowed_origins_patterns' => [],
    'allowed_headers'          => ['Content-Type', 'Accept', 'X-Refresh-Token'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => false,
];
