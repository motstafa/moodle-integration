const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Typed API error ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Response envelope ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  cached: boolean;
  cached_at: string;
}

// ── Domain types ───────────────────────────────────────────────────────────────

export interface SearchUser {
  id: number;
  username: string;
  fullname: string;
  email: string;
  suspended: boolean;
  profileimageurlsmall?: string;
  lastaccess?: number;
}

export interface Instructor {
  id: number;
  fullname: string;
}

export interface CourseEntry {
  id: number;
  fullname: string;
  shortname: string;
  hidden: boolean;
  grade?: string | null;
  instructors?: Instructor[];
}

export interface UserProfile {
  user: {
    id: number;
    username: string;
    fullname: string;
    email: string;
    suspended: boolean;
    profileimageurl?: string | null;
    lastaccess?: number | null;
  };
  courses_as_student: {
    current: CourseEntry[];
    previous: CourseEntry[];
  };
  courses_as_teacher: {
    editingteacher: CourseEntry[];
    teacher: CourseEntry[];
    teachingassistant: CourseEntry[];
  };
}

export interface EnrolledUser {
  id: number;
  fullname: string;
  email: string;
}

export interface CourseDetail {
  course: {
    id: number;
    shortname: string;
    fullname: string;
    summary: string;
    hidden: boolean;
    startdate?: number | null;
    enddate?: number | null;
    categoryid?: number | null;
  };
  enrolled_by_role: {
    editingteacher: EnrolledUser[];
    teacher: EnrolledUser[];
    student: EnrolledUser[];
    teachingassistant: EnrolledUser[];
  };
  totals: {
    editingteacher: number;
    teacher: number;
    student: number;
    teachingassistant: number;
  };
}

// ── Fetch helper ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', ...init?.headers },
    ...init,
  });

  const body = await res.json();

  if (!body.ok) {
    throw new ApiError(
      body.error?.message ?? `HTTP ${res.status}`,
      body.error?.code ?? 'UNKNOWN',
      res.status,
    );
  }

  return { data: body.data, cached: body.cached, cached_at: body.cached_at };
}

// ── Endpoint wrappers ──────────────────────────────────────────────────────────

export const searchUsers = (q: string) =>
  apiFetch<SearchUser[]>(`/users/search?q=${encodeURIComponent(q)}`);

export const getUserProfile = (id: number) =>
  apiFetch<UserProfile>(`/users/${id}`);

export const getCourseDetail = (id: number) =>
  apiFetch<CourseDetail>(`/courses/${id}`);

export async function flushCache(scope: string): Promise<void> {
  const token = process.env.NEXT_PUBLIC_REFRESH_TOKEN ?? '';
  await fetch(`${BASE}/cache/flush`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Refresh-Token': token,
    },
    body: JSON.stringify({ scope }),
  });
}
