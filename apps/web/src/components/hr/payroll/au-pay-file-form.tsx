import { Button } from "@/components/ui/button";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Period picker and download for the Xero and MYOB pay file. Australian organizations only. */
export function AuPayFileForm() {
  const now = new Date();
  const firstOfMonth = isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const today = isoDate(now);

  return (
    <form
      action="/api/hr/payroll/au-pay-file"
      className="flex flex-wrap items-end gap-4 rounded-lg border p-4"
      method="get"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="au-pay-file-from">
          From
        </label>
        <input
          className="block h-8 rounded-lg border px-2 text-sm"
          defaultValue={firstOfMonth}
          id="au-pay-file-from"
          name="from"
          required
          type="date"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="au-pay-file-to">
          To
        </label>
        <input
          className="block h-8 rounded-lg border px-2 text-sm"
          defaultValue={today}
          id="au-pay-file-to"
          name="to"
          required
          type="date"
        />
      </div>
      <Button type="submit">Download pay file</Button>
      <p className="basis-full text-sm text-muted-foreground">
        One CSV for Xero and MYOB. Hours and allowances only. Pay, tax, and super are worked out in
        Xero or MYOB.
      </p>
    </form>
  );
}
