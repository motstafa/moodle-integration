interface Props {
  rows?: number;
}

export default function LoadingSkeleton({ rows = 3 }: Props) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="h-3 w-1/4 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
