import type { DetailedPlanOutput, DetailedPlanWeek, IntakeInput, LeadInput, SubmitResponse, WeeklyBreakdown } from "./types";

interface SubmitPayload {
  lead: LeadInput | null;
  intake: IntakeInput;
  sourceTag?: string;
  planAlreadyGenerated?: boolean;
  planId?: string;
  submissionId?: string;
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
      throw new Error("Generation request timed out.");
    }
    const isNetworkFailure =
      error instanceof TypeError ||
      (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message));
    if (isNetworkFailure) {
      throw new Error(
        "Network error: planner API is not reachable. Start the backend (npm run dev:server) or use npm run dev:full.",
      );
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

export interface GenerateProgramRequestBody {
  intake: IntakeInput;
  existingPlan: DetailedPlanOutput;
  programLength: 12 | 24;
  continuation?: boolean;
  priorWeeks?: DetailedPlanWeek[];
  sourceTag?: string;
}

export async function generateProgramWeeksApi(
  apiBaseUrl: string,
  body: GenerateProgramRequestBody,
  timeoutMs = 120000,
): Promise<DetailedPlanWeek[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBaseUrl}/generate-program`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : null;
    const weeks = Array.isArray(data?.program) ? data.program : data?.weeks;
    if (!res.ok || !data?.ok || !Array.isArray(weeks)) {
      throw new Error(data?.error || "Program generation failed.");
    }
    return weeks as DetailedPlanWeek[];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateProgram(
  payload: { intake: IntakeInput; existingPlan: DetailedPlanOutput | null; programLength: 12 | 24; sourceTag: string; email?: string; firstName?: string },
  apiBaseUrl: string,
  timeoutMs = 60000,
): Promise<{ weeks?: WeeklyBreakdown[]; queued?: boolean; message?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${apiBaseUrl}/generate-program`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Programme generation failed");
    }

    // Fire-and-forget path: server responded immediately, plan will be emailed
    if (data.queued) {
      return { queued: true, message: data.message };
    }

    const weeks = Array.isArray(data.program) ? data.program : data.program?.weeks || data.weeks || [];
    return { weeks };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Programme generation timed out. This can take up to 60 seconds for a 24-week plan.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
