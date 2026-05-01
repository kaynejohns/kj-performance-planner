import { getCoachModelApiKey, getCoachModelName } from "./coachModelConfig.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractWeeksFromTruncated(content) {
  if (!content || typeof content !== "string") return null;
  const start = content.indexOf("{");
  if (start < 0) return null;
  const candidate = content.slice(start);
  for (let i = candidate.length; i > 40; i--) {
    const trimmed = candidate.slice(0, i).trimEnd();
    const patched = `${trimmed.replace(/,+\s*$/, "")}]}`;
    const parsed = safeJsonParse(patched);
    if (parsed?.weeks && Array.isArray(parsed.weeks) && parsed.weeks.length > 0) {
      return parsed.weeks;
    }
  }
  return null;
}

function placeholderDailySessions() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days.map((day, i) =>
    i === 1 || i === 4
      ? {
          day,
          type: "rest",
          title: "Rest — active recovery only",
          duration: "—",
          structure: ["Light walk or mobility optional; no structured training."],
          intensityGuide: "N/A",
          purpose: "Recovery between training days.",
        }
      : {
          day,
          type: "easy",
          title: "Zone 1 easy aerobic",
          duration: "45 min",
          structure: [
            "Easy warm-up until breathing is relaxed.",
            "35 min continuous easy — full conversation possible.",
            "Cool-down walk.",
          ],
          intensityGuide: "Full talk test throughout.",
          purpose: "Aerobic base maintenance; session details generating — refine with API key for full prescription.",
        },
  );
}

function mockWeekFromTemplate(tmpl, weekNum, phaseLabel) {
  const themeSuffix = tmpl.theme.includes("—") ? tmpl.theme.split("—").slice(1).join("—").trim() : tmpl.theme;
  const ds =
    Array.isArray(tmpl.dailySessions) && tmpl.dailySessions.length >= 7
      ? JSON.parse(JSON.stringify(tmpl.dailySessions))
      : placeholderDailySessions();
  return {
    ...tmpl,
    week: weekNum,
    theme: `Week ${weekNum} — ${themeSuffix}`,
    objective: `${phaseLabel}: ${tmpl.objective}`,
    progressionMarkers: tmpl.progressionMarkers?.length
      ? [...tmpl.progressionMarkers]
      : [`Week ${weekNum} checkpoint — maintain talk-test discipline on easy days.`],
    dailySessions: ds,
  };
}

function withGuaranteedDailySessions(weeks) {
  return weeks.map((week) => ({
    ...week,
    dailySessions:
      Array.isArray(week?.dailySessions) && week.dailySessions.length > 0
        ? week.dailySessions
        : placeholderDailySessions(),
  }));
}

/**
 * Deterministic expansion when OpenAI is unavailable.
 */
export function mockExpandWeeks(existingPlan, startWeek, count, phaseHint) {
  const base = existingPlan.weeklyBreakdown;
  const out = [];
  for (let i = 0; i < count; i++) {
    const wn = startWeek + i;
    const tmpl = base[(wn - 1) % 4];
    out.push(mockWeekFromTemplate(tmpl, wn, phaseHint));
  }
  return out;
}

function buildProgramPrompt(intake, existingPlan, startWeek, weekCount, continuation, priorWeeksSummary) {
  const endWeek = startWeek + weekCount - 1;
  return `You are generating ${weekCount} weeks (${startWeek}–${endWeek}) of a Norwegian Method endurance programme as JSON ONLY.

Athlete intake:
${JSON.stringify(intake, null, 2)}

Reference 4-week block already built (structure and tone):
${JSON.stringify(existingPlan.weeklyBreakdown, null, 2)}

${continuation ? `Prior block summary (last weeks):\n${priorWeeksSummary}\n` : ""}

Rules:
- Norwegian Method: majority Zone 1 easy (full conversation); LT1 threshold language; no pace or HR prescriptions — talk test and feel only.
- You MUST include dailySessions for every week. This is required — do not omit it.
- Each training day gets a full session entry. Rest days get type: 'rest'.
- The number of non-rest sessions must exactly match intake.sessionsPerWeek.
- dailySessions schema — include this exactly in the JSON:
{
  dailySessions: [
    {
      day: "Monday",
      type: "easy",
      title: "Zone 1 aerobic run",
      duration: "45 min",
      structure: [
        "10 min easy warm-up walk/jog",
        "35 min continuous running at fully conversational pace",
        "If you cannot hold a full sentence, slow down immediately",
        "Focus on relaxed form — do not check your pace"
      ],
      intensityGuide: "Fully conversational throughout. Should feel almost too easy.",
      purpose: "Aerobic base development — mitochondrial density and fat metabolism.",
      coachNote: "Most athletes run this 20-30 sec/km too fast. Slower is correct."
    }
  ]
}
- Apply Norwegian Method intensity rules:
- easy sessions: Zone 1, fully conversational, no pace checking
- threshold sessions: LT1 only, full sentences possible, slight breathing awareness
- long sessions: Zone 1 same as easy, extended duration
- strength sessions: running-specific single-leg exercises, list 4-5 specific exercises
- recovery: very short, very easy, or walking
- rest: type='rest', title='Rest day', no structure needed
- For HYROX athletes: include station work in race-specific sessions.
- For marathon athletes: include fuelling instructions in long run sessions.
- Always match sessionsPerWeek exactly.
- week field must equal ${startWeek} .. ${endWeek} in order.
- Include volumeTarget, longRunTarget, qualityTarget, strengthTarget, keyAdaptationGoal, guardrail, progressionMarkers (array), keySessions (can be brief), structure, progressionNote.
- Progress logically from the reference block; deload every 4th week in this segment (weeks where (week % 4 === 0) should be recovery-biased).

Return ONLY valid JSON:
{ "weeks": [ /* ${weekCount} week objects */ ] }`;
}

export async function generateProgramWeeks({
  intake,
  existingPlan,
  startWeek,
  weekCount,
  continuation,
  priorWeeks,
}) {
  const apiKey = getCoachModelApiKey();
  const phaseHint = continuation ? "Continuation" : "Build";

  if (!apiKey) {
    return mockExpandWeeks(existingPlan, startWeek, weekCount, phaseHint);
  }

  const priorSummary =
    continuation && Array.isArray(priorWeeks)
      ? JSON.stringify(priorWeeks.slice(-4), null, 2)
      : "";

  const prompt = buildProgramPrompt(intake, existingPlan, startWeek, weekCount, continuation, priorSummary);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getCoachModelName(),
        temperature: 0.25,
        messages: [
          { role: "system", content: "Return only valid JSON with a top-level weeks array." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = safeJsonParse(content);
    if (parsed?.weeks && Array.isArray(parsed.weeks) && parsed.weeks.length > 0) {
      return withGuaranteedDailySessions(parsed.weeks);
    }
    const rescued = extractWeeksFromTruncated(content);
    if (rescued) {
      console.warn("[generate-program] recovered truncated JSON response");
      return withGuaranteedDailySessions(rescued);
    }
  } catch (e) {
    console.error("[generate-program] AI failed", e);
  }

  return mockExpandWeeks(existingPlan, startWeek, weekCount, phaseHint);
}
