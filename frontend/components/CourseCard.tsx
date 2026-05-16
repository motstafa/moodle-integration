import Link from 'next/link';
import HiddenBadge from './HiddenBadge';
import type { CourseEntry } from '@/lib/api';

interface Props {
  course: CourseEntry;
}

export default function CourseCard({ course }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/courses/${course.id}`}
            className="line-clamp-2 font-medium text-slate-900 transition-colors hover:text-blue-700"
            title={course.fullname}
          >
            {course.fullname}
          </Link>
          <p className="mt-0.5 text-xs text-slate-400">{course.shortname}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {course.hidden && <HiddenBadge />}
          {course.grade != null && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {course.grade}
            </span>
          )}
        </div>
      </div>

      {course.instructors && course.instructors.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-medium">Instructors: </span>
          {course.instructors.map((inst, i) => (
            <span key={inst.id}>
              {i > 0 && ', '}
              <Link
                href={`/users/${inst.id}`}
                className="text-blue-600 hover:underline"
              >
                {inst.fullname}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
