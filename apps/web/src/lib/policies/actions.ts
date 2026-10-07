"use server";

import {
  acknowledgePolicy as acknowledgePolicyService,
  publishPolicy as publishPolicyService,
} from "@/lib/policies/service";

export async function publishPolicy(formData: FormData): Promise<void> {
  return publishPolicyService(formData);
}

export async function acknowledgePolicy(formData: FormData): Promise<void> {
  return acknowledgePolicyService(formData);
}
