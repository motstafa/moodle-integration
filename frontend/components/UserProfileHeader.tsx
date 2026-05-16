import Image from 'next/image';
import StatusBadge from './StatusBadge';

interface Props {
  user: {
    fullname: string;
    username: string;
    email: string;
    suspended: boolean;
    profileimageurl?: string | null;
    lastaccess?: number | null;
  };
}

function formatDate(ts?: number | null): string {
  if (!ts) return 'Never';
  return new Date(ts * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function UserProfileHeader({ user }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="h-20 bg-gradient-to-r from-blue-500 to-blue-700" />
      <div className="px-6 pb-6">
        <div className="-mt-10 mb-4 flex flex-wrap items-end gap-4">
          {user.profileimageurl ? (
            <Image
              src={user.profileimageurl}
              alt={user.fullname}
              width={80}
              height={80}
              className="rounded-full border-4 border-white object-cover shadow"
              unoptimized
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700 shadow">
              {user.fullname.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="mb-1 flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{user.fullname}</h1>
              <p className="text-sm text-slate-500">@{user.username}</p>
            </div>
            <StatusBadge suspended={user.suspended} />
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</dt>
            <dd className="mt-0.5 text-slate-700">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Last Access</dt>
            <dd className="mt-0.5 text-slate-700">{formatDate(user.lastaccess)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
