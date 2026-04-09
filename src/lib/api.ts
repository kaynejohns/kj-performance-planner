import type { DetailedPlanOutput, IntakeInput, LeadInput, SubmitResponse } from "./types";

interface SubmitPayload {
  lead: LeadInput;
  intake: IntakeInput;
  sourceTag?: string;
}

interface DetailedPlanPayload {
  input: IntakeInput;
  logicPlan: unknown;
  basePlan: DetailedPlanOutput;
  refinementPrompt: string;
}

export async function submitPlanner(
  payload: SubmitPayload,
  apiBaseUrl: string,
  timeoutMs = 12000,
): Promise<SubmitResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Generation request timed out. Using local fallback.");
    }
    throw new Error("Network error while requesting your performance plan.");
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error("Server returned an invalid response format.");
  }
  const responseData = data as Partial<SubmitResponse> & {
    details?: { lead?: string[]; intake?: string[] };
    error?: string;
    ok?: boolean;
  };
  if (!res.ok || !responseData?.ok) {
    const detailMessages: string[] = [
      ...(Array.isArray(responseData?.details?.lead) ? responseData.details.lead : []),
      ...(Array.isArray(responseData?.details?.intake) ? responseData.details.intake : []),
    ];
    throw new Error(detailMessages[0] || responseData?.error || "Failed to submit planner request.");
  }
  return responseData as SubmitResponse;
}

export async function refineDetailedPlan(
  payload: DetailedPlanPayload,
  apiBaseUrl: string,
  timeoutMs = 15000,
): Promise<DetailedPlanOutput> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBaseUrl}/detailed-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : null;
    if (!res.ok || !data?.ok || !data?.plan) {
      throw new Error(data?.error || "Detailed plan refinement failed.");
    }
    return data.plan as DetailedPlanOutput;
  } finally {
    clearTimeout(timeoutId);
  }
}
