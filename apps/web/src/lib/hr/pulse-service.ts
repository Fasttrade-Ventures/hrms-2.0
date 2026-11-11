/** @deprecated Use pulse-survey-templates / pulse-survey-runs. Kept so older imports fail clearly. */

export async function createPulseSurvey(): Promise<never> {
  throw new Error("createPulseSurvey was replaced by openPulseSurveyRun. Use /hr/pulse templates.");
}

export async function listPulseSurveys(): Promise<never> {
  throw new Error("listPulseSurveys was replaced by listPulseSurveyRuns.");
}

export async function submitPulseScore(): Promise<never> {
  throw new Error("submitPulseScore was replaced by submitStaffPulseSurvey.");
}

export async function listOpenPulseSurveys(): Promise<never> {
  throw new Error("listOpenPulseSurveys was replaced by listOpenPulseSurveysForEmployee.");
}
