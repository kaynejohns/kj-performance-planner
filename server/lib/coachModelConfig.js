/** Optional remote coaching-language refinement (JSON output). */
export function getCoachModelApiKey() {
  return (
    process.env.PERFORMANCE_PLANNER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  );
}

export function getCoachModelName() {
  return process.env.PERFORMANCE_PLANNER_MODEL || "gpt-4o-mini";
}
