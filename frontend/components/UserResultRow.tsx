import Link from 'next/link';
import Image from 'next/image';
import StatusBadge from './StatusBadge';
import type { SearchUser } from '@/lib/api';

interface Props {
  user: SearchUser;
}

function formatLastAccess(ts?: number): string {
  if (!ts) return 'Never';
  return new Date(ts * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function UserResultRow({ user }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-blue-200 hover:shadow">
      {user.profileimageurlsmall ? (
        <Image
          src={user.profileimageurlsmall}
          alt={user.fullname}
          width={40}
          height={40}
          className="shrink-0 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {user.fullname.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900" title={user.fullname}>{user.fullname}</p>
        <p className="truncate text-xs text-slate-400" title={user.email}>{user.email}</p>
      </div>

      <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
        {formatLastAccess(user.lastaccess)}
      </span>

      <StatusBadge suspended={user.suspended} />

      <Link
        href={`/users/${user.id}`}
        className="shrink-0 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
      >
        View →
      </Link>
    </div>
  );
}
