<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a requested Moodle resource (user, course) does not exist.
 * Rendered as a 404 JSON response by bootstrap/app.php.
 */
class NotFoundException extends RuntimeException {}
