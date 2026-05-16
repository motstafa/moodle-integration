<?php

namespace App\Services\Moodle;

use RuntimeException;

/**
 * Thrown when the Moodle Web Services API returns an application-level error.
 *
 * Moodle always responds with HTTP 200; errors are indicated by an `exception`
 * key in the JSON body. This exception carries the Moodle error code so callers
 * can distinguish between "user not found" (nosuchuser) and "token has no
 * permission" (serviceaccessexception), etc.
 */
class MoodleApiException extends RuntimeException
{
    public function __construct(
        private readonly string $moodleErrorCode,
        string $message,
    ) {
        parent::__construct($message);
    }

    public function moodleErrorCode(): string
    {
        return $this->moodleErrorCode;
    }
}
