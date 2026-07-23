"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-600">{error.message}</p>
        <button
          type="button"
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
