export type BukucloudPayrollPayload = {
  period_date: string;
  description?: string;
  reference_number: string;
  bank_account_code: string;
  gross_salaries: number;
  employer_epf?: number;
  employer_socso?: number;
  employer_eis?: number;
  employer_hrd?: number;
  epf_payable?: number;
  socso_payable?: number;
  eis_payable?: number;
  pcb_payable?: number;
  hrd_payable?: number;
  net_pay: number;
};

export type BukucloudPayrollResponse = {
  journal_entry_id: number;
  reference_number: string;
  date: string;
  status: string;
  total_debits: number;
  total_credits: number;
};

export type BukucloudConnectionConfig = {
  baseUrl: string;
  apiKey: string;
  signingKey: string;
  bankAccountCode: string;
  tenantLabel?: string;
  autoSyncOnLock: boolean;
  enabled: boolean;
};

export type PayrunTotalsForBukucloud = {
  gross: number;
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcb: number;
  hrdfEmployer: number;
  net: number;
};
