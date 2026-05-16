<?php

namespace App\Services\Moodle;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Low-level HTTP client for the Moodle Web Services REST API.
 *
 * Every public method maps 1-to-1 to a Moodle wsfunction. The token is
 * injected at construction time and is NEVER returned to the browser —
 * it only travels from this server to the Moodle endpoint.
 *
 * Error detection: Moodle always returns HTTP 200. Application-level
 * errors are signalled by an `exception` key in the JSON body. This class
 * checks for that key on every call and throws {@see MoodleApiException}
 * so callers never receive a silent failure.
 *
 * Caching is intentionally absent here; that responsibility belongs to the
 * service layer that wraps this client.
 */
class MoodleClient
{
    public function __construct(
        private readonly string $url,
        private readonly string $token,
    ) {}

    /**
     * Look up one or more users by a single field value.
     *
     * Wraps: {@see https://docs.moodle.org/dev/Core_APIs core_user_get_users_by_field}
     *
     * @param  string   $field  One of: id, idnumber, username, email, auth
     * @param  array    $values Values to look up (e.g. [1, 2, 3] for ids)
     * @return array           Flat array of user objects:
     *                         [{id, username, fullname, email, profileimageurl, …}]
     *
     * @throws MoodleApiException on Moodle application errors
     * @throws ConnectionException on network failure
     */
    public function getUsersByField(string $field, array $values): array
    {
        $params = ['field' => $field];
        foreach ($values as $i => $value) {
            $params["values[{$i}]"] = $value;
        }

        return $this->call('core_user_get_users_by_field', $params);
    }

    /**
     * Search for users using one or more key/value criteria.
     *
     * Wraps: core_user_get_users
     *
     * @param  array  $criteria  Array of ['key' => ..., 'value' => ...] pairs.
     *                           Supported keys: id, lastname, firstname, idnumber,
     *                           username, email, auth, confirmed, profile field names.
     *                           Values may include SQL wildcards (% and _).
     *                           Example: [['key' => 'email', 'value' => '%@aub.edu.lb']]
     * @return array             Flat array of user objects (same shape as getUsersByField).
     *
     * @throws MoodleApiException on Moodle application errors
     * @throws ConnectionException on network failure
     */
    public function searchUsers(array $criteria): array
    {
        $params = [];
        foreach ($criteria as $i => $criterion) {
            $params["criteria[{$i}][key]"]   = $criterion['key'];
            $params["criteria[{$i}][value]"] = $criterion['value'];
        }

        return $this->call('core_user_get_users', $params)['users'] ?? [];
    }

    /**
     * Return every course a user is enrolled in (any role).
     *
     * Wraps: core_enrol_get_users_courses
     *
     * @param  int    $userId  Moodle user ID
     * @return array           Array of course objects:
     *                         [{id, shortname, fullname, summary, startdate, enddate, …}]
     *
     * @throws MoodleApiException on Moodle application errors
     * @throws ConnectionException on network failure
     */
    public function getUserCourses(int $userId): array
    {
        return $this->call('core_enrol_get_users_courses', [
            'userid'          => $userId,
            'returnusercount' => 0,
        ]);
    }

    /**
     * Retrieve grade items for a user in a specific course.
     *
     * Wraps: gradereport_user_get_grade_items
     *
     * @param  int   $userId    Moodle user ID
     * @param  int   $courseId  Moodle course ID
     * @return array            Grade report object:
     *                          {usergrades: [{courseid, userid, gradeitems: [{itemname, gradeformatted, …}]}],
     *                           warnings: []}
     *
     * @throws MoodleApiException on Moodle application errors
     * @throws ConnectionException on network failure
     */
    public function getUserGrades(int $userId, int $courseId): array
    {
        return $this->call('gradereport_user_get_grade_items', [
            'userid'   => $userId,
            'courseid' => $courseId,
        ]);
    }

    /**
     * Return all users enrolled in a course, including their role assignments.
     *
     * Wraps: core_enrol_get_enrolled_users
     *
     * This is the function to use when you need to know *what role* each
     * participant holds (student, teacher, etc.), because core_user_get_users
     * does not include role data.
     *
     * @param  int   $courseId  Moodle course ID
     * @return array            Array of user objects each with a `roles` key:
     *                          [{id, fullname, email, roles: [{roleid, shortname, name}], …}]
     *
     * @throws MoodleApiException on Moodle application errors
     * @throws ConnectionException on network failure
     */
    public function getCourseEnrolledUsers(int $courseId): array
    {
        return $this->call('core_enrol_get_enrolled_users', [
            'courseid' => $courseId,
        ]);
    }

    /**
     * Fetch a course (or courses) by a single field.
     *
     * Wraps: core_course_get_courses_by_field
     *
     * @param  string  $field  One of: id, ids, shortname, idnumber, category
     * @param  string  $value  The field value to match
     * @return array           Flat array of course objects:
     *                         [{id, shortname, fullname, summary, categoryid, …}]
     *
     * @throws MoodleApiException on Moodle application errors
     * @throws ConnectionException on network failure
     */
    public function getCourseByField(string $field, string $value): array
    {
        return $this->call('core_course_get_courses_by_field', [
            'field' => $field,
            'value' => $value,
        ])['courses'] ?? [];
    }

    /**
     * Execute a Moodle Web Services REST call.
     *
     * Always uses POST so large parameter sets (e.g. many enrolled users) do
     * not hit URL-length limits. The token is merged into every request here
     * and never appears anywhere else in the codebase.
     *
     * @throws MoodleApiException   when the JSON body contains an `exception` key
     * @throws ConnectionException  when the HTTP request itself fails
     */
    private function call(string $function, array $params = []): array
    {
        $start = microtime(true);

        $response = Http::asForm()
            ->timeout(30)
            ->post($this->url . '/webservice/rest/server.php', array_merge([
                'wstoken'            => $this->token,
                'wsfunction'         => $function,
                'moodlewsrestformat' => 'json',
            ], $params));

        $durationMs = (int) round((microtime(true) - $start) * 1000);
        $data       = $response->json();

        if (!is_array($data)) {
            Log::channel('single')->warning("Moodle API [{$function}] invalid_response", [
                'duration_ms' => $durationMs,
            ]);
            throw new MoodleApiException(
                'invalid_response',
                "Moodle returned a non-JSON response for function '{$function}'"
            );
        }

        if (isset($data['exception'])) {
            $code = $data['errorcode'] ?? 'unknown';
            Log::channel('single')->warning("Moodle API [{$function}] error:{$code}", [
                'duration_ms' => $durationMs,
            ]);
            throw new MoodleApiException(
                errorCode: $code,
                message:   "[{$function}] {$data['message']}",
            );
        }

        Log::channel('single')->info("Moodle API [{$function}] ok", [
            'duration_ms' => $durationMs,
        ]);

        return $data;
    }
}
