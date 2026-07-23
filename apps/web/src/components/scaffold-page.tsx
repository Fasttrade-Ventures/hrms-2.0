import { Placeholder } from "@hrms/ui";

export function ScaffoldPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      <Placeholder label={`Scaffold: ${title}`} />
    </div>
  );
}
