import { HrCheckbox, HrField, HrSelect, HrTextInput } from "@/components/hr/employees/form-fields";

export type AuEmployeeFieldValues = {
  employmentBasis?: "full_time" | "part_time" | "casual" | null;
  hourlyRate?: number | null;
  taxNumber?: string | null;
  bsb?: string | null;
  bankAccountNumber?: string | null;
  superFundName?: string | null;
  superUsi?: string | null;
  superMemberNumber?: string | null;
  taxFreeThreshold?: boolean;
  studyLoan?: boolean;
};

/**
 * Australian tax, bank and super fields for the employee form.
 * Field names match `auEmployeeSchema`. The TFN is stored in `tax_number`.
 */
export function AuEmployeeFields({ values = {} }: { values?: AuEmployeeFieldValues }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <HrField id="employmentBasis" label="Employment basis">
          <HrSelect defaultValue={values.employmentBasis ?? ""} id="employmentBasis" name="employmentBasis" required>
            <option value="">-- Select --</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="casual">Casual</option>
          </HrSelect>
        </HrField>
        <HrField id="hourlyRate" label="Hourly rate (A$)">
          <HrTextInput
            defaultValue={values.hourlyRate ? String(values.hourlyRate) : ""}
            id="hourlyRate"
            inputMode="decimal"
            name="hourlyRate"
            placeholder="0.00"
            required
          />
        </HrField>
        <HrField hint="8 or 9 digits" id="taxNumber" label="Tax File Number">
          <HrTextInput
            defaultValue={values.taxNumber ?? ""}
            id="taxNumber"
            inputMode="numeric"
            name="taxNumber"
            required
          />
        </HrField>
        <HrField hint="6 digits" id="bsb" label="BSB">
          <HrTextInput
            defaultValue={values.bsb ?? ""}
            id="bsb"
            inputMode="numeric"
            maxLength={6}
            name="bsb"
            required
          />
        </HrField>
        <HrField id="bankAccountNumber" label="Account number">
          <HrTextInput
            defaultValue={values.bankAccountNumber ?? ""}
            id="bankAccountNumber"
            maxLength={20}
            name="bankAccountNumber"
            required
          />
        </HrField>
        <HrField id="superFundName" label="Super fund">
          <HrTextInput
            defaultValue={values.superFundName ?? ""}
            id="superFundName"
            name="superFundName"
            required
          />
        </HrField>
        <HrField id="superUsi" label="Super fund USI">
          <HrTextInput
            defaultValue={values.superUsi ?? ""}
            id="superUsi"
            maxLength={20}
            name="superUsi"
            required
          />
        </HrField>
        <HrField id="superMemberNumber" label="Super member number">
          <HrTextInput
            defaultValue={values.superMemberNumber ?? ""}
            id="superMemberNumber"
            maxLength={30}
            name="superMemberNumber"
            required
          />
        </HrField>
      </div>
      <div className="flex flex-wrap gap-6">
        <HrCheckbox
          defaultChecked={values.taxFreeThreshold ?? false}
          id="taxFreeThreshold"
          label="Claims the tax-free threshold"
          name="taxFreeThreshold"
        />
        <HrCheckbox
          defaultChecked={values.studyLoan ?? false}
          id="studyLoan"
          label="Has a study or training loan"
          name="studyLoan"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        BukuHR stores these details for HR and the pay file. PAYG, super and Single Touch Payroll are
        handled in Xero or MYOB.
      </p>
    </div>
  );
}
