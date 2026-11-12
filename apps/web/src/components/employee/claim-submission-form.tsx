"use client";

import { useState } from "react";
import { submitClaim } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrSelect,
  HrTextInput,
} from "@/components/employee/employee-request-form";
import { currencySymbolLabel, formatMoney, type DisplayCurrency } from "@/lib/money";

export type ClaimTypeOption = {
  id: string;
  name: string;
  max_amount: number | null;
  is_mileage?: boolean | null;
  rate_per_km?: number | null;
  requires_receipt?: boolean | null;
};

export function ClaimSubmissionForm({
  claimTypes,
  today,
  currency = "MYR",
}: {
  claimTypes: ClaimTypeOption[];
  today: string;
  currency?: DisplayCurrency;
}) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const selectedType = claimTypes.find((t) => t.id === selectedTypeId);
  const isMileage = Boolean(selectedType?.is_mileage);
  const requiresReceipt = Boolean(selectedType?.requires_receipt);
  const ratePerKm = selectedType?.rate_per_km != null ? Number(selectedType.rate_per_km) : 0;

  const distanceNum = parseFloat(distance) || 0;
  const calculatedMileageAmount = isMileage && distanceNum > 0 && ratePerKm > 0
    ? (distanceNum * ratePerKm).toFixed(2)
    : "0.00";

  return (
    <EmployeeRequestForm
      action={submitClaim}
      description="Submit standard expenses or distance-based mileage travel claims."
      submitLabel="Submit claim"
      title="New claim"
    >
      <input name="isMileage" type="hidden" value={isMileage ? "true" : "false"} />
      {isMileage && (
        <>
          <input name="ratePerKm" type="hidden" value={ratePerKm} />
          <input name="amount" type="hidden" value={calculatedMileageAmount} />
        </>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <HrField id="claimTypeId" label="Claim type">
          <HrSelect
            id="claimTypeId"
            name="claimTypeId"
            required
            value={selectedTypeId}
            onChange={(e) => {
              setSelectedTypeId(e.target.value);
            }}
          >
            <option value="">Select type</option>
            {claimTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.is_mileage
                  ? ` (Mileage @ ${formatMoney(Number(type.rate_per_km ?? 0), currency)}/km)`
                  : type.max_amount
                    ? ` (max ${formatMoney(Number(type.max_amount), currency)})`
                    : ""}
              </option>
            ))}
          </HrSelect>
        </HrField>

        <HrField id="receiptDate" label="Receipt / Travel date">
          <HrTextInput defaultValue={today} id="receiptDate" name="receiptDate" required type="date" />
        </HrField>

        {isMileage ? (
          <>
            <HrField id="origin" label="Origin">
              <HrTextInput
                id="origin"
                name="origin"
                placeholder="e.g. Office / Site A"
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </HrField>

            <HrField id="destination" label="Destination">
              <HrTextInput
                id="destination"
                name="destination"
                placeholder="e.g. Client Office / Site B"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </HrField>

            <HrField id="distanceKm" label="Distance (km)">
              <HrTextInput
                id="distanceKm"
                min="0.1"
                name="distanceKm"
                placeholder="0.0"
                required
                step="0.1"
                type="number"
                value={distance}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-"].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setDistance(e.target.value)}
              />
            </HrField>

            <div className="flex flex-col justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] p-3.5">
              <span className="text-xs text-[var(--foreground-muted)]">Calculated Total ({currencySymbolLabel(currency)})</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold text-[var(--foreground-primary)]">
                  {formatMoney(Number(calculatedMileageAmount), currency)}
                </span>
                <span className="text-xs text-[var(--foreground-secondary)]">
                  ({distanceNum} km × {formatMoney(ratePerKm, currency)}/km)
                </span>
              </div>
            </div>
          </>
        ) : (
          <HrField id="amount" label={`Amount (${currency})`}>
            <HrTextInput
              id="amount"
              min="0.01"
              name="amount"
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={amount}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => setAmount(e.target.value)}
            />
          </HrField>
        )}

        <div className="md:col-span-2 space-y-1">
          <HrField
            id="receipt"
            label={`Receipt attachment ${requiresReceipt ? "(Required)" : "(Optional)"}`}
          >
            <input
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="block w-full text-xs text-[var(--foreground-muted)] file:mr-3 file:rounded-[var(--radius-md)] file:border-0 file:bg-[var(--accent-primary)] file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:opacity-90 file:cursor-pointer cursor-pointer rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] p-1.5 focus:outline-hidden focus:ring-1 focus:ring-[var(--border-focus)]"
              id="receipt"
              name="receipt"
              required={requiresReceipt}
              type="file"
            />
          </HrField>
          <p className="text-[11px] text-[var(--foreground-muted)] pl-0.5">
            Upload a clear photo or copy of your receipt or clinic invoice (PDF, PNG, JPG up to 10 MB).
          </p>
        </div>

        <div className="md:col-span-2">
          <HrField id="description" label="Description / Purpose">
            <HrTextInput id="description" name="description" placeholder="Optional details or trip purpose" />
          </HrField>
        </div>
      </div>
    </EmployeeRequestForm>
  );
}
