export type BillplzBillState = "due" | "paid" | "deleted";

export type BillplzCreateBillInput = {
  collectionId: string;
  email: string;
  name: string;
  amountSen: number;
  description: string;
  callbackUrl: string;
  redirectUrl?: string;
  reference1?: string;
  reference1Label?: string;
  dueAt?: string;
};

export type BillplzBill = {
  id: string;
  collection_id: string;
  paid: boolean;
  state: BillplzBillState;
  amount: number;
  paid_amount: number;
  due_at: string;
  email: string;
  mobile: string | null;
  name: string;
  url: string;
  paid_at: string | null;
  description: string;
  reference_1?: string | null;
  reference_1_label?: string | null;
};

export type BillplzCallbackPayload = Record<string, string | undefined> & {
  id?: string;
  paid?: string;
  state?: string;
  amount?: string;
  paid_amount?: string;
  x_signature?: string;
};
