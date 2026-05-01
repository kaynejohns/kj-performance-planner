import Anthropic from "@anthropic-ai/sdk";
import { buildCTA, buildPrompt, mockPlanFromInput } from "./plannerRules.js";

let _client = null;
function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Blueprint uses Haiku — fast (3-6s), fits within any serverless timeout.
// Program generation uses Sonnet — better quality for long structured output.
const BLUEPRINT_MODEL = () => process.env.BLUEPRINT_MODEL || "claude-haiku-4-5-20251001";
const PROGRAM_MODEL   = () => process.env.PERFORMANCE_PLANNER_MODEL || "claude-sonnet-4-6";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function withHardcodedCta(plan, input) {
  if (plan && typeof plan === "object") {
    plan.cta = buildCTA(input);
  }
  return plan;
}

/**
 * Raw prompt → assistant text (Anthropic Messages API).
 * Used by /api/performance-planner/generate-program and detailed-plan (large, Sonnet).
 */
export async function generateWithModel(prompt, system) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const isLargeRequest = !system;
  const model = isLargeRequest ? PROGRAM_MODEL() : BLUEPRINT_MODEL();
  const maxTokens = isLargeRequest ? 32000 : 4000;
  const params = {
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
  };

  if (isLargeRequest) {
    const stream = getClient().messages.stream(params);
    const response = await stream.finalMessage();
    return response.content[0]?.type === "text" ? response.content[0].text : "";
  }

  const response = await getClient().messages.create(params);
  return response.content[0]?.type === "text" ? response.content[0].text : "";
}

export async function generatePerformancePlan(input) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.warn("[generatePerformancePlan] No API key — using mock plan.");
    return withHardcodedCta(mockPlanFromInput(input), input);
  }

  const prompt = buildPrompt(input);
  const system =
    "You are a senior performance coach. Return ONLY valid JSON matching the schema in the user prompt. No markdown, no commentary, no code fences.";

  const raw = await generateWithModel(prompt, system);
  // Extract the JSON object directly — handles code fences and any leading/trailing text.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? safeJsonParse(jsonMatch[0]) : null;
  if (!parsed) {
    console.error("[generatePerformancePlan] JSON parse failed — falling back to mock. Raw:", raw.slice(0, 300));
    return withHardcodedCta(mockPlanFromInput(input), input);
  }

  return withHardcodedCta(parsed, input);
}
