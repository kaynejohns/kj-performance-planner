// ─── DiagnosisReveal.tsx ─────────────────────────────────────────────────────
// Full-screen diagnosis moment. Renders after plan generation, before dashboard.
// The athlete must actively dismiss it to see the plan.
// This is the product. Everything else is delivery.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import type { IntakeInput, PlannerOutput } from "../lib/types";

interface Diagnosis {
  openingStatement: string;   // The one uncomfortable truth
  limiterExplanation: string; // Why this specific limiter is THE limiter
  timelineReality: string;    // Honest framing of what the goal requires
  commonMistake: string;      // The thing athletes like them get wrong
  forwardStatement: string;   // What changes now they know this
  strengthNote?: string;      // Load tolerance callout — only when lower limb injury history
}

interface DiagnosisRevealProps {
  plan: PlannerOutput;
  intake: IntakeInput;
  onContinue: (email: string) => void;
  apiBaseUrl: string;
}

export default function DiagnosisReveal({
  plan,
  intake,
  onContinue,
  apiBaseUrl,
}: DiagnosisRevealProps) {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [firstNameValue, setFirstNameValue] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    generateDiagnosis();
  }, []);

  // Staggered reveal — each section appears one at a time.
  // total = 5 base lines + 1 if strengthNote exists.
  // Line i is visible when lineIndex > i. CTA shows at lineIndex >= total.
  useEffect(() => {
    if (!diagnosis) return;
    const total = 5 + (diagnosis.strengthNote ? 1 : 0);
    const timer = setInterval(() => {
      setLineIndex((i) => {
        if (i >= total) { clearInterval(timer); return i; }
        return i + 1;
      });
    }, 600);
    return () => clearInterval(timer);
  }, [diagnosis]);

  async function generateDiagnosis() {
    try {
      const res = await fetch(`${apiBaseUrl}/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake, plan }),
      });
      const data = await res.json();
      if (data.ok && data.diagnosis) {
        setDiagnosis(data.diagnosis);
      } else {
        setDiagnosis(buildFallbackDiagnosis(intake, plan));
      }
    } catch {
      setDiagnosis(buildFallbackDiagnosis(intake, plan));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit() {
    if (!emailValue.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: { firstName: firstNameValue || "Athlete", email: emailValue, consentToMarketing: false },
          intake,
          planAlreadyGenerated: true,
          planId: plan._id,
        }),
      });
    } catch {
      // fail silently — unlock the blueprint regardless
    }
    onContinue(emailValue);
  }

  if (loading) {
    return (
      <div style={styles.shell}>
        <div style={styles.loadingWrap}>
          <div style={styles.loadingDot} />
          <p style={styles.loadingText}>Analysing your profile...</p>
        </div>
      </div>
    );
  }

  if (!diagnosis) return null;

  const lines = [
    { key: "opening",  content: diagnosis.openingStatement,   style: styles.opening },
    { key: "limiter",  content: diagnosis.limiterExplanation, style: styles.body },
    { key: "timeline", content: diagnosis.timelineReality,    style: styles.body },
    { key: "mistake",  content: diagnosis.commonMistake,      style: styles.mistake },
    { key: "forward",  content: diagnosis.forwardStatement,   style: styles.forward },
    ...(diagnosis.strengthNote
      ? [{ key: "strength", content: diagnosis.strengthNote, style: styles.forward }]
      : []),
  ];
  const totalLines = lines.length;

  return (
    <div style={styles.shell}>
      {/* Sport + goal context */}
      <p style={styles.context}>
        {intake.sport} · {intake.eventType} · {intake.currentBenchmark || "current"} → {intake.goalBenchmark || "goal"}
      </p>

      {/* Main diagnosis content */}
      <div style={styles.content}>
        {lines.map((line, i) => (
          <div
            key={line.key}
            style={{
              ...line.style,
              opacity: lineIndex > i ? 1 : 0,
              transform: lineIndex > i ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            {i === 3 && (
              <p style={styles.mistakeLabel}>Most common mistake for athletes like you</p>
            )}
            {i === 4 && (
              <p style={styles.forwardLabel}>What changes now</p>
            )}
            {line.key === "strength" && (
              <p style={styles.forwardLabel}>Strength is in your plan for a reason</p>
            )}
            <p>{line.content}</p>
          </div>
        ))}
      </div>

      {/* CTA — only appears after all lines revealed */}
      <div
        style={{
          ...styles.ctaWrap,
          opacity: lineIndex >= totalLines ? 1 : 0,
          transition: "opacity 0.6s ease 0.3s",
        }}
      >
        {!showEmailCapture ? (
          <>
            <button style={styles.ctaButton} onClick={() => setShowEmailCapture(true)}>
              Show me the blueprint →
            </button>
            <p style={styles.ctaNote}>
              Your {plan.gapSummary?.classification || "personalised"} plan is ready
            </p>
          </>
        ) : (
          <div style={styles.emailForm}>
            <p style={styles.emailHeading}>Enter your details to unlock your blueprint</p>
            <input
              type="text"
              placeholder="First name (optional)"
              value={firstNameValue}
              onChange={(e) => setFirstNameValue(e.target.value)}
              style={styles.emailInput}
            />
            <input
              type="email"
              placeholder="Email address"
              value={emailValue}
              onChange={(e) => { setEmailValue(e.target.value); setEmailError(""); }}
              style={styles.emailInput}
              onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
            />
            {emailError && <p style={styles.emailErrorText}>{emailError}</p>}
            <button
              style={{ ...styles.ctaButton, opacity: emailSubmitting ? 0.6 : 1 }}
              onClick={handleEmailSubmit}
              disabled={emailSubmitting}
            >
              {emailSubmitting ? "Unlocking..." : "Unlock my blueprint →"}
            </button>
            <p style={styles.ctaNote}>No spam. Just your blueprint.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fallback diagnosis (no API call needed) ──────────────────────────────────
function buildFallbackDiagnosis(intake: IntakeInput, plan: PlannerOutput): Diagnosis {
  const limiter = plan.snapshot?.mainLimiter || intake.weakness || "aerobic base";
  const classification = plan.gapSummary?.classification || "significant challenge";
  const timeline = plan.gapSummary?.timelineEstimate || "several training blocks";
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";

  const openingMap: Record<string, string> = {
    "Aerobic base": `You've been putting in the work. The problem isn't effort — it's that your aerobic engine isn't built to support the times you're chasing yet. That's fixable, but it requires a different approach than what most athletes take.`,
    "Threshold capacity": `Your fitness is there. But your threshold — the ceiling above which your body accumulates fatigue faster than it can clear it — is limiting everything else. Raising that ceiling is the entire job.`,
    "Fatigue resistance": `You're not getting fitter because you're training in the wrong zone most of the time. Not too easy. Not hard enough. The grey zone that accumulates fatigue without driving adaptation. That stops now.`,
    "Strength": `Your aerobic fitness is ahead of your structural capacity. Your muscles, tendons, and connective tissue aren't yet built to handle the training load your cardiovascular system could theoretically support. Strength work isn't optional for you — it's the unlock.`,
    "Durability": `You keep getting close and then something breaks down. That's not bad luck — it's a load management problem. Your fitness is building faster than your body's ability to absorb it.`,
  };

  const mistakeMap: Record<string, string> = {
    "Aerobic base": `Running easy sessions too fast. If your easy pace is within 45 seconds per kilometre of your threshold pace, it isn't easy. It's moderate — and moderate training is the enemy of aerobic development.`,
    "Threshold capacity": `Doing threshold sessions at LT2 (race effort) instead of LT1 (controlled discomfort). The result is sessions that feel hard but don't drive the adaptation you need.`,
    "Fatigue resistance": `Adding more quality sessions to try to break through the plateau. The answer is almost always the opposite — more easy volume, not more intensity.`,
    "Strength": `Treating strength as optional or as cross-training. For athletes with your profile, strength is primary. It is not supplementary.`,
    "Durability": `Pushing through warning signs. Pain above 3/10 that warms up worse is a stop signal, not a challenge to overcome.`,
  };

  return {
    openingStatement: openingMap[intake.weakness] || openingMap["Aerobic base"],
    limiterExplanation: `Your primary limiter is ${limiter}. This is the single thing that, if improved, moves every other number. The plan is built entirely around addressing this first — not because other things don't matter, but because this is the lever that moves the rest.`,
    timelineReality: `Your goal is a ${classification}. ${timeline}. This isn't discouraging — it's useful. Knowing the realistic timeline means you can build toward it properly instead of chasing fitness you don't have the foundation for yet.`,
    commonMistake: mistakeMap[intake.weakness] || mistakeMap["Aerobic base"],
    forwardStatement: isHyrox
      ? `Every session in this plan has a specific reason for existing. The aerobic work builds the engine. The station work builds the efficiency. The structure tells your body what to adapt to. Follow it consistently and the results follow.`
      : `Every session in this plan is there for a reason tied directly to your limiter. The easy runs aren't filler. The threshold sessions are precisely calibrated. The structure is the point. Trust it.`,
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  shell: {
    position: "fixed",
    inset: 0,
    background: "#070707",
    zIndex: 9999,
    overflowY: "auto",
    padding: "40px 24px",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 16,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#ff8a1a",
    animation: "pulse 1.5s ease infinite",
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.06em",
  },
  context: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "#ff8a1a",
    marginBottom: 48,
    maxWidth: 640,
    margin: "0 auto 48px",
    textAlign: "center" as const,
  },
  content: {
    maxWidth: 640,
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    gap: 32,
  },
  opening: {
    fontSize: "clamp(22px, 3.5vw, 32px)",
    fontWeight: 600,
    color: "#ffffff",
    lineHeight: 1.35,
    letterSpacing: "-0.01em",
  },
  body: {
    fontSize: 17,
    fontWeight: 300,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 1.75,
    borderLeft: "2px solid rgba(255,138,26,0.3)",
    paddingLeft: 16,
  },
  mistake: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.7,
    background: "rgba(255,138,26,0.05)",
    border: "1px solid rgba(255,138,26,0.15)",
    borderRadius: 12,
    padding: "16px 20px",
  },
  mistakeLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#ff8a1a",
    marginBottom: 8,
  },
  forward: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.7,
  },
  forwardLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.25)",
    marginBottom: 8,
  },
  ctaWrap: {
    marginTop: 56,
    maxWidth: 640,
    margin: "56px auto 0",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 12,
  },
  ctaButton: {
    background: "#ff8a1a",
    color: "#000",
    fontSize: 15,
    fontWeight: 700,
    padding: "14px 40px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  ctaNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.2)",
  },
  emailForm: {
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  emailHeading: {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center" as const,
    margin: "0 0 4px",
  },
  emailInput: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "13px 16px",
    fontSize: 15,
    color: "#ffffff",
    outline: "none",
    width: "100%",
  },
  emailErrorText: {
    fontSize: 12,
    color: "#ff6b6b",
    margin: 0,
    textAlign: "center" as const,
  },
};
