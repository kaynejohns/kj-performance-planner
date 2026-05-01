import { generateProgram } from "./api";
import type { DetailedPlanOutput, DetailedPlanWeek, IntakeInput } from "./types";

export async function generate12WeekProgram(
  apiBaseUrl: string,
  intake: IntakeInput,
  existingPlan: DetailedPlanOutput,
  sourceTag?: string,
): Promise<DetailedPlanWeek[]> {
  const { weeks } = await generateProgram(
    { intake, existingPlan, programLength: 12, sourceTag: sourceTag ?? "embed" },
    apiBaseUrl,
    90000,
  );
  return weeks;
}

export async function generate24WeekProgram(
  apiBaseUrl: string,
  intake: IntakeInput,
  existingPlan: DetailedPlanOutput,
  sourceTag: string | undefined,
  onProgress?: (message: string) => void,
): Promise<DetailedPlanWeek[]> {
  onProgress?.("Generating weeks 1-24...");
  const { weeks } = await generateProgram(
    { intake, existingPlan, programLength: 24, sourceTag: sourceTag ?? "embed" },
    apiBaseUrl,
    120000,
  );
  return weeks;
}
