import type { IntakeInput } from "./types";

/** True when weekly km / long-run bands apply (vs HYROX-style minute loads). */
export function usesRunningVolumeBands(input: IntakeInput): boolean {
  return (
    input.sport === "Running" &&
    input.eventType !== "HYROX" &&
    input.eventType !== "Team sport conditioning"
  );
}
