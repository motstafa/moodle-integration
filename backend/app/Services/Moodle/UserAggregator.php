<?php

namespace App\Services\Moodle;

use App\Exceptions\NotFoundException;
use Illuminate\Support\Facades\Cache;

/**
 * Builds the full user-profile aggregate in one pass.
 *
 * For each of the user's enrolled courses this class:
 *   1. Fetches all enrolled participants (cached per course) to discover
 *      (a) what role(s) the target user holds and (b) who the instructors are.
 *   2. For student courses it fetches the formatted course-level grade.
 *
 * Role classification rules (documented in README):
 *   - Student      : shortname === 'student'
 *   - Editing teacher : shortname === 'editingteacher'
 *   - Non-editing teacher : shortname === 'teacher'
 *   - Teaching assistant : shortname in ('ta','teachingassistant','teacher_assistant')
 *
 * "Previous" course rule (documented in README):
 *   A course is considered previous when its enddate is set (> 0) AND is in the past.
 *   If enddate is 0 or unset the course is current regardless of visible status.
 */
class UserAggregator
{
    private const ENROLLED_TTL = 900;

    private const TA_ROLES = ['ta', 'teachingassistant', 'teacher_assistant'];

    public function __construct(private readonly MoodleClient $client) {}

    /**
     * Build the complete user profile aggregate.
     *
     * @throws NotFoundException when the user ID does not exist in Moodle
     * @throws MoodleApiException on Moodle API errors
     */
    public function build(int $userId): array
    {
        $users = $this->client->getUsersByField('id', [$userId]);
        $user  = $users[0] ?? null;

        if (!$user) {
            throw new NotFoundException("User with id={$userId} not found in Moodle.");
        }

        $courses = $this->client->getUserCourses($userId);
        $now     = time();

        $studentCurrent  = [];
        $studentPrevious = [];
        $teacherGroups   = [
            'editingteacher'    => [],
            'teacher'           => [],
            'teachingassistant' => [],
        ];

        foreach ($courses as $course) {
            $courseId = (int) $course['id'];

            // Enrolled users list is cached independently — shared with CourseAggregator.
            $enrolled = $this->getEnrolledUsers($courseId);

            // Find this user's entry and extract their roles.
            $myEntry = null;
            foreach ($enrolled as $e) {
                if ((int) $e['id'] === $userId) {
                    $myEntry = $e;
                    break;
                }
            }
            $myRoles = $myEntry ? array_column($myEntry['roles'] ?? [], 'shortname') : [];

            // Collect instructors (editingteacher or teacher, excluding the user themselves).
            $instructors = [];
            foreach ($enrolled as $e) {
                if ((int) $e['id'] === $userId) continue;
                $eRoles = array_column($e['roles'] ?? [], 'shortname');
                if (in_array('editingteacher', $eRoles) || in_array('teacher', $eRoles)) {
                    $instructors[] = ['id' => (int) $e['id'], 'fullname' => $e['fullname']];
                }
            }

            $isPrevious = ($course['enddate'] ?? 0) > 0 && (int) $course['enddate'] < $now;
            $base = [
                'id'        => $courseId,
                'fullname'  => $course['fullname'],
                'shortname' => $course['shortname'],
                'hidden'    => ($course['visible'] ?? 1) === 0,
            ];

            // Student
            if (in_array('student', $myRoles)) {
                $entry = array_merge($base, [
                    'grade'       => $this->fetchGrade($userId, $courseId),
                    'instructors' => $instructors,
                ]);
                $isPrevious ? $studentPrevious[] = $entry : $studentCurrent[] = $entry;
            }

            // Editing teacher
            if (in_array('editingteacher', $myRoles)) {
                $teacherGroups['editingteacher'][] = $base;
            }

            // Non-editing teacher
            if (in_array('teacher', $myRoles)) {
                $teacherGroups['teacher'][] = $base;
            }

            // Teaching assistant
            if (array_intersect($myRoles, self::TA_ROLES)) {
                $teacherGroups['teachingassistant'][] = $base;
            }
        }

        return [
            'user' => [
                'id'              => (int) $user['id'],
                'username'        => $user['username'] ?? '',
                'fullname'        => $user['fullname'],
                'email'           => $user['email'],
                'suspended'       => (bool) ($user['suspended'] ?? false),
                'profileimageurl' => $user['profileimageurl'] ?? null,
                'lastaccess'      => $user['lastaccess'] ?? null,
            ],
            'courses_as_student' => [
                'current'  => $studentCurrent,
                'previous' => $studentPrevious,
            ],
            'courses_as_teacher' => $teacherGroups,
        ];
    }

    /**
     * Fetch enrolled users for a course, using a per-course cache entry so that
     * multiple user-profile builds in the same request window share the result.
     *
     * Public so CacheFlushController can warm/invalidate it by course ID.
     */
    public function getEnrolledUsers(int $courseId): array
    {
        return Cache::remember(
            "moodle:courses:{$courseId}:enrolled",
            self::ENROLLED_TTL,
            fn () => $this->client->getCourseEnrolledUsers($courseId)
        );
    }

    /**
     * Fetch the formatted course-level grade for a student.
     * Returns null silently on any error — a single grade failure must not
     * abort the entire user-profile aggregate.
     */
    private function fetchGrade(int $userId, int $courseId): ?string
    {
        try {
            $report = $this->client->getUserGrades($userId, $courseId);
            $items  = $report['usergrades'][0]['gradeitems'] ?? [];

            foreach ($items as $item) {
                if (($item['itemtype'] ?? '') === 'course') {
                    $fmt = $item['gradeformatted'] ?? null;
                    return ($fmt && trim($fmt) !== '-') ? trim($fmt) : null;
                }
            }
        } catch (\Throwable) {
            // Grade unavailability silently returns null.
        }

        return null;
    }
}
