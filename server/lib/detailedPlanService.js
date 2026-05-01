import { getCoachModelApiKey, getCoachModelName } from "./coachModelConfig.js";
import { generateWithModel } from "./coachPlanGenerationService.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function withGuaranteedDailySessions(plan, basePlan) {
  if (!plan?.weeklyBreakdown || !Array.isArray(plan.weeklyBreakdown)) return plan;
  const baseWeeks = Array.isArray(basePlan?.weeklyBreakdown) ? basePlan.weeklyBreakdown : [];
  const weeks = plan.weeklyBreakdown.map((week, idx) => {
    if (Array.isArray(week?.dailySessions) && week.dailySessions.length > 0) return week;
    const fallback = baseWeeks[idx]?.dailySessions;
    if (Array.isArray(fallback) && fallback.length > 0) {
      return { ...week, dailySessions: fallback };
    }
    return week;
  });
  return { ...plan, weeklyBreakdown: weeks };
}

export async function refineDetailedPlan(payload) {
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    try {
      const content = await generateWithModel(
        payload.refinementPrompt,
        "Return only valid JSON. Keep schema exact.",
      );
      const parsed = safeJsonParse(content);
      if (!parsed) return payload.basePlan;
      return withGuaranteedDailySessions(parsed, payload.basePlan);
    } catch {
      return payload.basePlan;
    }
  }

  const apiKey = getCoachModelApiKey();
  if (!apiKey) return payload.basePlan;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getCoachModelName(),
        temperature: 0.2,
        messages: [
          { role: "system", content: "Return only valid JSON. Keep schema exact." },
          { role: "user", content: payload.refinementPrompt },
        ],
      }),
    });
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = safeJsonParse(content);
    if (!parsed) return payload.basePlan;
    return withGuaranteedDailySessions(parsed, payload.basePlan);
  } catch {
    return payload.basePlan;
  }
}
