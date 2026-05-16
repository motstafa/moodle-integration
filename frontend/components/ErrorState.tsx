interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
