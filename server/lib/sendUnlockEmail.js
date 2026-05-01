function formatGapSummary(gap) {
  if (!gap || typeof gap !== "object") return "";
  const parts = [];
  if (gap.summary) parts.push(String(gap.summary));
  if (gap.classification) parts.push(`Classification: ${gap.classification}`);
  if (gap.improvementRequired) parts.push(`Improvement: ${gap.improvementRequired}`);
  if (gap.timelineEstimate) parts.push(`Timeline: ${gap.timelineEstimate}`);
  if (Array.isArray(gap.primaryPriorities) && gap.primaryPriorities.length) {
    parts.push(`Priorities: ${gap.primaryPriorities.join("; ")}`);
  }
  return parts.join("\n");
}

/**
 * Plain-text confirmation after unlock (Resend). No-op if RESEND_API_KEY is unset.
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 */
export async function sendUnlockConfirmationEmail({ to, firstName, headline, gapSummary }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[kj-planner] RESEND_API_KEY not set; skipping unlock email");
    return { sent: false, reason: "no_api_key" };
  }

  const from = process.env.RESEND_FROM || "KJ Performance <onboarding@resend.dev>";
  const subject = process.env.RESEND_UNLOCK_SUBJECT || "Your performance plan summary";
  const name = (firstName || "there").trim();
  const gapText =
    typeof gapSummary === "string"
      ? gapSummary
      : formatGapSummary(gapSummary) || "Open your planner to see the full gap analysis and next steps.";

  const text = [
    `Hi ${name},`,
    "",
    "Thanks for unlocking your personal performance plan. Here's a quick recap:",
    "",
    headline ? `Headline: ${headline}` : "",
    "",
    gapText,
    "",
    "— KJ Performance",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[kj-planner] Resend error", res.status, errBody);
    return { sent: false, reason: "resend_error" };
  }

  return { sent: true };
}
