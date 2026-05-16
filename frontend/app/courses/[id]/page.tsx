'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCourseDetail, ApiError } from '@/lib/api';
import EnrolledUsersList from '@/components/EnrolledUsersList';
import ErrorState from '@/components/ErrorState';
import CacheStatus from '@/components/CacheStatus';
import HiddenBadge from '@/components/HiddenBadge';
import type { CourseDetail, ApiResponse } from '@/lib/api';

function classifyError(err: unknown): { message: string; showBack?: boolean } {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.code === 'NOT_FOUND') {
      return { message: 'Course not found.', showBack: true };
    }
    if (err.code === 'MOODLE_UNREACHABLE') {
      return { message: "Couldn't reach the server. Check your connection and try again." };
    }
    if (['MOODLE_PERMISSION_DENIED', 'accessdenied'].includes(err.code)) {
      console.error(`Moodle permission error [${err.code}]: ${err.message}`);
      return { message: "You don't have permission to view this course." };
    }
    return { message: err.message };
  }
  if (err instanceof TypeError) {
    return { message: "Couldn't reach the server. Check your connection and try again." };
  }
  return { message: err instanceof Error ? err.message : 'Failed to load course.' };
}

function CourseSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Course header card */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-6 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-1/4 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-16 rounded-full bg-slate-100" />
        </div>
        <div className="mt-4 h-12 rounded bg-slate-100" />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-slate-100" />
          ))}
        </div>
      </div>
      {/* User list skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-0">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(ts?: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id, 10);

  const [resp, setResp] = useState<ApiResponse<CourseDetail> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<{ message: string; showBack?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorInfo(null);
    try {
      const data = await getCourseDetail(courseId);
      setResp(data);
    } catch (err) {
      setErrorInfo(classifyError(err));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!isNaN(courseId)) load();
  }, [courseId, load]);

  if (isNaN(courseId)) {
    return <ErrorState message="Invalid course ID." />;
  }

  const course = resp?.data.course;
  const totals = resp?.data.totals;

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

      {loading && <CourseSkeleton />}

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

      {resp && !loading && course && totals && (
        <>
          <CacheStatus
            cached={resp.cached}
            cachedAt={resp.cached_at}
            scope={`courses:${courseId}`}
            onFlushed={load}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900" title={course.fullname}>
                  {course.fullname}
                </h1>
                <p className="mt-0.5 text-sm text-slate-400">{course.shortname}</p>
              </div>
              {course.hidden ? (
                <HiddenBadge />
              ) : (
                <span className="shrink-0 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Visible
                </span>
              )}
            </div>

            {course.summary && (
              <p className="mt-3 text-sm text-slate-600">{course.summary}</p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Start</dt>
                <dd className="mt-0.5 text-slate-700">{formatDate(course.startdate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">End</dt>
                <dd className="mt-0.5 text-slate-700">{formatDate(course.enddate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Students</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{totals.student}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Staff</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {totals.editingteacher + totals.teacher + totals.teachingassistant}
                </dd>
              </div>
            </dl>
          </div>

          <section>
            <h2 className="mb-4 text-base font-semibold text-slate-900">Enrolled Users</h2>
            <EnrolledUsersList
              groups={[
                { label: 'Editing Teachers', users: resp.data.enrolled_by_role.editingteacher },
                { label: 'Teachers', users: resp.data.enrolled_by_role.teacher },
                { label: 'Teaching Assistants', users: resp.data.enrolled_by_role.teachingassistant },
                { label: 'Students', users: resp.data.enrolled_by_role.student },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
