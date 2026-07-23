import Link from "next/link";

const portals = [
  { href: "/auth/login", label: "Auth" },
  { href: "/employee/dashboard", label: "Employee" },
  { href: "/manager/dashboard", label: "Manager" },
  { href: "/hr/dashboard", label: "HR Admin" },
  { href: "/branch-admin/dashboard", label: "Branch Admin" },
  { href: "/director/dashboard", label: "Director" },
  { href: "/owner/dashboard", label: "Organization Owner" },
  { href: "/platform/dashboard", label: "Platform Admin" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-8">
      <div>
        <p className="text-sm font-medium text-blue-600">HRMS scaffold</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Hybrid HRMS</h1>
        <p className="mt-2 text-slate-600">
          Monorepo skeleton. Pick a portal route group to verify the scaffold.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {portals.map((portal) => (
          <li key={portal.href}>
            <Link
              className="block rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm hover:border-blue-300"
              href={portal.href}
            >
              {portal.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
