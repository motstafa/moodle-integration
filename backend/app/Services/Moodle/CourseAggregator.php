<?php

namespace App\Services\Moodle;

use App\Exceptions\NotFoundException;
use Illuminate\Support\Facades\Cache;

/**
 * Builds the full course aggregate: course metadata + all enrolled users
 * grouped by their Moodle role.
 *
 * Role mapping:
 *   editingteacher, teacher, student → kept as-is
 *   ta / teachingassistant / teacher_assistant → mapped to 'teachingassistant'
 *   All other roles → ignored in the grouped output
 *
 * The enrolled-user cache key (moodle:courses:{id}:enrolled) is shared with
 * UserAggregator so both can warm from a single Moodle call.
 */
class CourseAggregator
{
    private const ENROLLED_TTL = 900;

    public function __construct(private readonly MoodleClient $client) {}

    /**
     * @throws NotFoundException when the course does not exist
     * @throws MoodleApiException on Moodle API errors
     */
    public function build(int $courseId): array
    {
        $courses = $this->client->getCourseByField('id', (string) $courseId);
        $course  = $courses[0] ?? null;

        if (!$course) {
            throw new NotFoundException("Course with id={$courseId} not found in Moodle.");
        }

        $enrolled = Cache::remember(
            "moodle:courses:{$courseId}:enrolled",
            self::ENROLLED_TTL,
            fn () => $this->client->getCourseEnrolledUsers($courseId)
        );

        $byRole = [
            'editingteacher'    => [],
            'teacher'           => [],
            'student'           => [],
            'teachingassistant' => [],
        ];

        $seen = [];  // prevent a user appearing twice in the same bucket

        foreach ($enrolled as $u) {
            $uid   = (int) $u['id'];
            $roles = array_column($u['roles'] ?? [], 'shortname');
            $entry = [
                'id'       => $uid,
                'fullname' => $u['fullname'],
                'email'    => $u['email'] ?? '',
            ];

            foreach ($roles as $role) {
                $bucket = $this->mapRole($role);
                if ($bucket && !isset($seen[$bucket][$uid])) {
                    $byRole[$bucket][]     = $entry;
                    $seen[$bucket][$uid]   = true;
                }
            }
        }

        return [
            'course' => [
                'id'         => (int) $course['id'],
                'shortname'  => $course['shortname'],
                'fullname'   => $course['fullname'],
                'summary'    => strip_tags($course['summary'] ?? ''),
                'hidden'     => ($course['visible'] ?? 1) === 0,
                'startdate'  => ($course['startdate'] ?? 0) ?: null,
                'enddate'    => ($course['enddate'] ?? 0) ?: null,
                'categoryid' => $course['categoryid'] ?? null,
            ],
            'enrolled_by_role' => $byRole,
            'totals'           => array_map('count', $byRole),
        ];
    }

    private function mapRole(string $shortname): ?string
    {
        return match (true) {
            $shortname === 'editingteacher'                                          => 'editingteacher',
            $shortname === 'teacher'                                                 => 'teacher',
            $shortname === 'student'                                                 => 'student',
            in_array($shortname, ['ta', 'teachingassistant', 'teacher_assistant'])  => 'teachingassistant',
            default                                                                  => null,
        };
    }
}
