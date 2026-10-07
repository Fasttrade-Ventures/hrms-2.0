"use server";

import {
  addTemplateKpi as addTemplateKpiService,
  saveEmployeeKpiScore as saveEmployeeKpiScoreService,
  saveManagerKpiScore as saveManagerKpiScoreService,
} from "@/lib/performance/kpi-service";

export async function addTemplateKpi(formData: FormData): Promise<void> {
  return addTemplateKpiService(formData);
}

export async function saveEmployeeKpiScore(appraisalId: string, formData: FormData): Promise<void> {
  return saveEmployeeKpiScoreService(appraisalId, formData);
}

export async function saveManagerKpiScore(appraisalId: string, formData: FormData): Promise<void> {
  return saveManagerKpiScoreService(appraisalId, formData);
}
