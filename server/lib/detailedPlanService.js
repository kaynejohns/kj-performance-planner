import { getCoachModelApiKey, getCoachModelName } from "./coachModelConfig.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function refineDetailedPlan(payload) {
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
    return parsed || payload.basePlan;
  } catch {
    return payload.basePlan;
  }
}
