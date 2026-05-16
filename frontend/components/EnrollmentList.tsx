import CourseCard from './CourseCard';
import type { CourseEntry } from '@/lib/api';

interface Props {
  label: string;
  courses: CourseEntry[];
  /** When provided, render the section with this message instead of hiding it. */
  emptyMessage?: string;
}

export default function EnrollmentList({ label, courses, emptyMessage }: Props) {
  if (courses.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">{label}</h3>
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">
        {label}
        <span className="ml-2 text-xs font-normal text-slate-400">({courses.length})</span>
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  );
}
