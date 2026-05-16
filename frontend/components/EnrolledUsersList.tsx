import Link from 'next/link';
import type { EnrolledUser } from '@/lib/api';

interface Group {
  label: string;
  users: EnrolledUser[];
}

interface Props {
  groups: Group[];
}

export default function EnrolledUsersList({ groups }: Props) {
  return (
    <div className="space-y-6">
      {groups.map(({ label, users }) => (
        <section key={label}>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            {label}
            <span className="ml-2 text-xs font-normal text-slate-400">({users.length})</span>
          </h3>
          {users.length === 0 ? (
            <p className="text-sm text-slate-400">No users enrolled.</p>
          ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {users.map((user, i) => (
              <div
                key={user.id}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  {user.fullname.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/users/${user.id}`}
                    className="text-sm font-medium text-slate-900 transition-colors hover:text-blue-700"
                  >
                    {user.fullname}
                  </Link>
                  <p className="truncate text-xs text-slate-400" title={user.email}>{user.email}</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </section>
      ))}
    </div>
  );
}
