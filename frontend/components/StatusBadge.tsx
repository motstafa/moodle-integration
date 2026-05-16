interface Props {
  suspended: boolean;
}

export default function StatusBadge({ suspended }: Props) {
  if (suspended) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
        Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      Active
    </span>
  );
}
