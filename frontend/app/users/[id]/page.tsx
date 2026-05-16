'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, ApiError } from '@/lib/api';
import UserProfileHeader from '@/components/UserProfileHeader';
import EnrollmentList from '@/components/EnrollmentList';
import ErrorState from '@/components/ErrorState';
import CacheStatus from '@/components/CacheStatus';
import type { UserProfile, ApiResponse } from '@/lib/api';

const PERMISSION_CODES = [
  'MOODLE_PERMISSION_DENIED',
  'accessdenied',
  'invalidtoken',
  'serviceaccessexception',
];

function classifyError(err: unknown): { message: string; showBack?: boolean } {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.code === 'NOT_FOUND' || err.code === 'USER_NOT_FOUND') {
      return { message: 'User not found.', showBack: true };
    }
    if (PERMISSION_CODES.includes(err.code)) {
      console.error(`Moodle permission error [${err.code}]: ${err.message}`);
      return { message: "You don't have permission to view this user's full profile." };
    }
    if (err.code === 'MOODLE_UNREACHABLE') {
      return { message: "Couldn't reach the server. Check your connection and try again." };
    }
    return { message: err.message };
  }
  if (err instanceof TypeError) {
    return { message: "Couldn't reach the server. Check your connection and try again." };
  }
  return { message: err instanceof Error ? err.message : 'Failed to load user profile.' };
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header card */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="h-20 bg-slate-200" />
        <div className="px-6 pb-6">
          <div className="-mt-8 mb-4 flex items-end gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-300" />
            <div className="mb-1 space-y-2">
              <div className="h-5 w-40 rounded bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
        </div>
      </div>
      {/* Course cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-slate-100 bg-white" />
        ))}
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id, 10);

  const [resp, setResp] = useState<ApiResponse<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<{ message: string; showBack?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorInfo(null);
    try {
      const data = await getUserProfile(userId);
      setResp(data);
    } catch (err) {
      setErrorInfo(classifyError(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isNaN(userId)) load();
  }, [userId, load]);

  if (isNaN(userId)) {
    return <ErrorState message="Invalid user ID." />;
  }

  const profile = resp?.data;
  const hasStudentCourses =
    (profile?.courses_as_student.current.length ?? 0) > 0 ||
    (profile?.courses_as_student.previous.length ?? 0) > 0;
  const hasTeacherCourses =
    (profile?.courses_as_teacher.editingteacher.length ?? 0) > 0 ||
    (profile?.courses_as_teacher.teacher.length ?? 0) > 0 ||
    (profile?.courses_as_teacher.teachingassistant.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </Link>

      {loading && <ProfileSkeleton />}

      {errorInfo && !loading && (
        <div className="space-y-4">
          <ErrorState
            message={errorInfo.message}
            onRetry={errorInfo.showBack ? undefined : load}
          />
          {errorInfo.showBack && (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              ← Back to search
            </Link>
          )}
        </div>
      )}

      {resp && !loading && profile && (
        <>
          <CacheStatus
            cached={resp.cached}
            cachedAt={resp.cached_at}
            scope={`users:${userId}`}
            onFlushed={load}
          />

          <UserProfileHeader user={profile.user} />

          <div className="space-y-8">
            {/* Student sections — always show current (even if empty), hide previous when empty */}
            {(hasStudentCourses ||
              profile.courses_as_student.current.length === 0) && (
              <section>
                <h2 className="mb-4 text-base font-semibold text-slate-900">Enrolled as Student</h2>
                <div className="space-y-6">
                  <EnrollmentList
                    label="Current Courses"
                    courses={profile.courses_as_student.current}
                    emptyMessage="No current enrollments."
                  />
                  <EnrollmentList
                    label="Previous Courses"
                    courses={profile.courses_as_student.previous}
                  />
                </div>
              </section>
            )}

            {/* Teacher sections — only shown when at least one role has courses */}
            {hasTeacherCourses && (
              <section>
                <h2 className="mb-4 text-base font-semibold text-slate-900">Teaching Roles</h2>
                <div className="space-y-6">
                  <EnrollmentList
                    label="Editing Teacher"
                    courses={profile.courses_as_teacher.editingteacher}
                  />
                  <EnrollmentList
                    label="Teacher"
                    courses={profile.courses_as_teacher.teacher}
                  />
                  <EnrollmentList
                    label="Teaching Assistant"
                    courses={profile.courses_as_teacher.teachingassistant}
                  />
                </div>
              </section>
            )}

            {!hasStudentCourses &&
              !hasTeacherCourses && (
                <p className="text-sm text-slate-500">This user has no course enrollments.</p>
              )}
          </div>
        </>
      )}
    </div>
  );
}
