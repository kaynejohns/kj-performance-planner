import { buildPrompt, mockPlanFromInput } from "./plannerRules.js";
import { getCoachModelApiKey, getCoachModelName } from "./coachModelConfig.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function generatePerformancePlan(input) {
  const apiKey = getCoachModelApiKey();
  // Without remote configuration, use the deterministic performance template.
  if (!apiKey) return mockPlanFromInput(input);

  const prompt = buildPrompt(input);
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
          { role: "system", content: "Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = safeJsonParse(content);
    return parsed || mockPlanFromInput(input);
  } catch {
    return mockPlanFromInput(input);
  }
}
