"use client";

import { useState } from "react";
import { submitClaim } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrSelect,
  HrTextInput,
} from "@/components/employee/employee-request-form";

export type ClaimTypeOption = {
  id: string;
  name: string;
  max_amount: number | null;
  is_mileage?: boolean | null;
  rate_per_km?: number | null;
};

export function ClaimSubmissionForm({
  claimTypes,
  today,
}: {
  claimTypes: ClaimTypeOption[];
  today: string;
}) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const selectedType = claimTypes.find((t) => t.id === selectedTypeId);
  const isMileage = Boolean(selectedType?.is_mileage);
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
                  ? ` (Mileage @ RM ${Number(type.rate_per_km ?? 0).toFixed(2)}/km)`
                  : type.max_amount
                    ? ` (max RM ${type.max_amount})`
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
                onChange={(e) => setDistance(e.target.value)}
              />
            </HrField>

            <div className="flex flex-col justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] p-3.5">
              <span className="text-xs text-[var(--foreground-muted)]">Calculated Total (RM)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold text-[var(--foreground-primary)]">
                  RM {calculatedMileageAmount}
                </span>
                <span className="text-xs text-[var(--foreground-secondary)]">
                  ({distanceNum} km × RM {ratePerKm.toFixed(2)}/km)
                </span>
              </div>
            </div>
          </>
        ) : (
          <HrField id="amount" label="Amount (MYR)">
            <HrTextInput
              id="amount"
              name="amount"
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </HrField>
        )}

        <div className="md:col-span-2">
          <HrField id="description" label="Description / Purpose">
            <HrTextInput id="description" name="description" placeholder="Optional details or trip purpose" />
          </HrField>
        </div>
      </div>
    </EmployeeRequestForm>
  );
}
