"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { exportComplianceMatrixCsv } from "@/app/(hr)/hr/documents/compliance/actions";

export function ExportComplianceButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      setError(null);
      try {
        const { csv, filename } = await exportComplianceMatrixCsv();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button disabled={isPending} onClick={handleExport} size="sm" type="button" variant="outline">
        Export CSV
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
