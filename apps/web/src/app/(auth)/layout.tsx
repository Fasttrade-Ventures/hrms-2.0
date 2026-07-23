import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-blue-600">HRMS</p>
          <p className="mt-1 text-xs text-slate-500">Fasttrade Ventures</p>
        </div>
        {children}
      </div>
    </div>
  );
}
