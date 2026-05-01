import Anthropic from "@anthropic-ai/sdk";
import { buildCTA, buildPrompt, mockPlanFromInput } from "./plannerRules.js";

// Lazy client — created on first use so process.env is fully loaded by then.
let _client = null;
function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

function getDefaultModel() {
  return process.env.PERFORMANCE_PLANNER_MODEL || "claude-sonnet-4-6";
}

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
 * Optional `system` for JSON-only refinement flows.
 * Used by /api/performance-planner/generate-program (user prompt only).
 */
export async function generateWithModel(prompt, system) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to server/.env in the kj-app project.");
  }

  // Short calls (initial plan with a system prompt) use non-streaming — fast enough.
  // Large calls (full programme, no system prompt) use streaming — required by the SDK
  // when max_tokens is high enough that the request could exceed 10 minutes non-streamed.
  const isLargeRequest = !system;
  const maxTokens = isLargeRequest ? 32000 : 4000;
  const params = {
    model: getDefaultModel(),
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
  // If no API key, fall back to mock so local dev without a key still works.
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.warn("[generatePerformancePlan] No API key — using mock plan.");
    return withHardcodedCta(mockPlanFromInput(input), input);
  }

  const prompt = buildPrompt(input);
  const system =
    "You are a senior performance coach. Return ONLY valid JSON matching the schema in the user prompt. No markdown, no commentary, no code fences.";

  const raw = await generateWithModel(prompt, system);
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = safeJsonParse(cleaned);
  if (!parsed) {
    console.error("[generatePerformancePlan] JSON parse failed — falling back to mock. Raw:", raw.slice(0, 300));
    return withHardcodedCta(mockPlanFromInput(input), input);
  }

  return withHardcodedCta(parsed, input);
}
