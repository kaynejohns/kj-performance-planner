/**
 * Performance audit engine.
 * Pure calculation from intake fields — zero AI tokens.
 * Returns a structured audit with named insights the athlete has never had named.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Parse "H:MM:SS" or "MM:SS" or plain minutes into total seconds
function parseBenchmark(str) {
  if (!str) return null;
  const parts = str.replace(/[^0-9:]/g, "").split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1 && !isNaN(parts[0])) return parts[0] * 60;
  return null;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Volume analysis ───────────────────────────────────────────────────────────
function analyseVolume(intake) {
  const { weeklyKm, longestRun, sessionsPerWeek, hoursPerWeek, qualitySessionsPerWeek, sport } = intake;
  const isHyrox = sport === "HYROX" || sport === "Hybrid";

  const results = {};

  if (weeklyKm && sessionsPerWeek) {
    results.avgSessionKm = round1(weeklyKm / sessionsPerWeek);
  }

  if (weeklyKm && longestRun) {
    results.longRunPct = pct(longestRun, weeklyKm);
    // Ideal long run is 25–35% of weekly volume
    if (results.longRunPct > 38) {
      results.longRunDiagnosis = "stress_event";
    } else if (results.longRunPct < 20) {
      results.longRunDiagnosis = "underdone";
    } else {
      results.longRunDiagnosis = "appropriate";
    }
  }

  if (hoursPerWeek && qualitySessionsPerWeek != null) {
    const qualityRatio = pct(qualitySessionsPerWeek, sessionsPerWeek);
    results.qualityRatioPct = qualityRatio;
    // Ideal is 15-25% quality sessions (Norwegian Method)
    if (qualityRatio > 40) results.qualityDiagnosis = "too_much_intensity";
    else if (qualityRatio === 0) results.qualityDiagnosis = "no_quality";
    else results.qualityDiagnosis = "appropriate";
  }

  if (weeklyKm && hoursPerWeek) {
    results.kmPerHour = round1(weeklyKm / hoursPerWeek);
    results.easyRunsAreTooFast = results.kmPerHour > 12;
  }

  results.isHyrox = isHyrox;
  return results;
}

// ── Benchmark gap analysis ────────────────────────────────────────────────────
function analyseBenchmarkGap(intake) {
  const current = parseBenchmark(intake.currentBenchmark);
  const goal = parseBenchmark(intake.goalBenchmark);

  if (!current || !goal || goal >= current) return null;

  const gapSeconds = current - goal;
  const gapPct = round1((gapSeconds / current) * 100);

  let difficulty = "achievable";
  if (gapPct > 15) difficulty = "ambitious";
  if (gapPct > 25) difficulty = "long_term";

  // Estimate weeks needed based on gap
  // ~1-1.5% improvement per 4-week block is realistic for trained athletes
  const blocksNeeded = Math.ceil(gapPct / 1.2);
  const weeksNeeded = blocksNeeded * 4;

  return {
    currentFormatted: formatTime(current),
    goalFormatted: formatTime(goal),
    gapSeconds,
    gapPct,
    difficulty,
    weeksNeeded,
  };
}

// ── Named insight generator ───────────────────────────────────────────────────
function buildInsights(intake, volume, gap) {
  const insights = [];
  const { weakness, level, trainingConsistency, fatigueLevel, injuryStatus, sport, eventType } = intake;
  const isHyrox = sport === "HYROX" || sport === "Hybrid";

  // ── Long run insight ──
  if (volume.longRunPct && volume.longRunKm && volume.weeklyKm) {
    if (volume.longRunDiagnosis === "stress_event") {
      insights.push({
        type: "warning",
        headline: "Your long run is functioning as a stress event, not an aerobic stimulus",
        detail: `Your longest run is ${intake.longestRun}km — ${volume.longRunPct}% of your ${intake.weeklyKm}km weekly volume. Above 35% and the long run stops building your aerobic base and starts just accumulating fatigue. This is likely why you feel flat the day after your long run rather than recovered.`,
      });
    } else if (volume.longRunDiagnosis === "underdone") {
      insights.push({
        type: "flag",
        headline: "Your long run is leaving aerobic adaptation on the table",
        detail: `At ${volume.longRunPct}% of weekly volume, your longest run isn't long enough to drive the aerobic adaptations you need. For ${eventType} athletes, the long run should be 25–33% of weekly volume — yours has room to grow.`,
      });
    }
  }

  // ── Easy run intensity insight ──
  if (volume.easyRunsAreTooFast) {
    insights.push({
      type: "warning",
      headline: "Your easy runs are almost certainly too fast",
      detail: `${intake.weeklyKm}km in ${intake.hoursPerWeek} hours works out to ${volume.kmPerHour}km/h average — that's above the zone where easy running actually stays easy for most athletes. Running easy sessions 10–20% slower than you think feels embarrassing. It also dramatically changes what happens to your aerobic system.`,
    });
  }

  // ── Quality ratio insight ──
  if (volume.qualityDiagnosis === "too_much_intensity") {
    insights.push({
      type: "warning",
      headline: "Too much of your training is hard",
      detail: `${intake.qualitySessionsPerWeek} quality sessions across ${intake.sessionsPerWeek} total sessions means ${volume.qualityRatioPct}% of your training is high intensity. Elite endurance athletes rarely exceed 20%. The research on this is clear — excess intensity without aerobic base to absorb it produces diminishing returns and injury risk.`,
    });
  } else if (volume.qualityDiagnosis === "no_quality") {
    insights.push({
      type: "flag",
      headline: "No structured quality work — you're leaving speed on the table",
      detail: `You reported 0 quality sessions per week. Without at least one structured threshold or quality session weekly, aerobic fitness plateaus. Easy volume alone won't close the gap to your goal.`,
    });
  }

  // ── Weakness-specific insight ──
  if (weakness === "Aerobic base") {
    insights.push({
      type: "diagnosis",
      headline: "Your limiter is your aerobic engine — not your effort",
      detail: `Athletes who report aerobic base as their limiter almost always have the same pattern: they work hard in sessions but can't hold the effort for long, and easy runs feel uncomfortable at paces that should be easy. The fix isn't more hard work — it's rebuilding the base that makes hard work stick.`,
    });
  } else if (weakness === "Threshold fitness") {
    insights.push({
      type: "diagnosis",
      headline: "You have the base — but your threshold ceiling is too low",
      detail: `Threshold fitness is the key determinant of performance in every event from 5k to full HYROX. You likely have decent aerobic base and can handle volume — but the ceiling on your sustained hard effort limits everything above it. Systematic threshold work, done at the right intensity, is the highest-ROI training you can do.`,
    });
  } else if (weakness === "Fatigue resistance") {
    insights.push({
      type: "diagnosis",
      headline: "You fade — and that's a specific trainable problem",
      detail: `Fatigue resistance isn't a fitness problem, it's a training distribution problem. Athletes who fade late in events or between sessions typically don't have inadequate fitness — they have training that doesn't replicate the specific demand of the late race. That's fixable.`,
    });
  } else if (weakness === "Strength") {
    insights.push({
      type: "diagnosis",
      headline: "Strength isn't optional for endurance athletes — it's protective",
      detail: `Strength is the most underinvested area in most endurance athletes' training. It doesn't just add power — it reduces injury risk, improves running economy, and extends the window before form breakdown under fatigue. One well-programmed strength session per week changes your durability ceiling.`,
    });
  }

  // ── HYROX-specific ──
  if (isHyrox && gap) {
    const minPerKm = gap.gapSeconds > 300 ? "station efficiency and compromised running speed" : "compromised running tolerance under late-race fatigue";
    insights.push({
      type: "diagnosis",
      headline: `A ${gap.gapSeconds > 300 ? Math.round(gap.gapSeconds / 60) + "-minute" : gap.gapPct + "%"} HYROX improvement means fixing ${minPerKm}`,
      detail: `HYROX times are set on the runs between stations, not on the stations themselves. Most athletes lose time by blowing up their run pace after heavy station work. The training priority is compromised running — running at race pace after accumulated station fatigue. That's a skill you have to train specifically.`,
    });
  }

  // ── Consistency insight ──
  if (trainingConsistency === "Patchy — training when I can" || trainingConsistency === "Just getting back into it") {
    insights.push({
      type: "flag",
      headline: "Consistency is your primary limiter — not fitness",
      detail: `Irregular training doesn't just slow adaptation — it actively reverses it. Aerobic fitness gains made in 4 weeks can be partially lost in 10 days of inactivity. The best plan for an inconsistent athlete is a lower-volume plan they actually execute, not an ambitious plan they partially complete.`,
    });
  }

  // ── Fatigue insight ──
  if (fatigueLevel === "Burnt out — need a lighter start" || fatigueLevel === "Tired — carrying significant fatigue") {
    insights.push({
      type: "flag",
      headline: "Starting this block fatigued means the first two weeks are already compromised",
      detail: `Training on accumulated fatigue doesn't just reduce performance — it reduces the adaptation signal. Your body can't supercompensate if it hasn't recovered from the last stress. The plan accounts for this with a conservative week 1, but honest recovery in the first 7 days will determine the quality of weeks 3–12.`,
    });
  }

  // ── Benchmark gap insight ──
  if (gap) {
    if (gap.difficulty === "long_term") {
      insights.push({
        type: "reality",
        headline: `${gap.gapPct}% improvement doesn't happen in one block`,
        detail: `Going from ${gap.currentFormatted} to ${gap.goalFormatted} is a ${gap.gapPct}% performance improvement. Sustainable gains for a trained athlete are 1–1.5% per 4-week block. Realistically, this target is ${gap.weeksNeeded}+ weeks away — which is fine, but the plan needs to reflect that reality, not chase it prematurely.`,
      });
    } else if (gap.difficulty === "ambitious") {
      insights.push({
        type: "flag",
        headline: `${gap.gapPct}% improvement is achievable — but requires structured progression`,
        detail: `The gap from ${gap.currentFormatted} to ${gap.goalFormatted} is ${gap.gapPct}% — ambitious but realistic over 3–4 training blocks. It won't happen by training harder in a single block. It happens through consistent, progressive overload with adequate recovery. That's exactly what this plan is built around.`,
      });
    }
  }

  return insights;
}

// ── Summary paragraph (the "screenshot moment") ──────────────────────────────
function buildSummaryParagraph(intake, volume, gap) {
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const parts = [];

  if (intake.weeklyKm && intake.sessionsPerWeek) {
    parts.push(
      `You're training ${intake.weeklyKm}km across ${intake.sessionsPerWeek} sessions — averaging ${volume.avgSessionKm}km per session.`
    );
  } else if (isHyrox && intake.hoursPerWeek) {
    parts.push(`You're training approximately ${intake.hoursPerWeek} hours per week across ${intake.sessionsPerWeek} sessions.`);
  }

  if (volume.longRunPct) {
    const longRunVerdict =
      volume.longRunDiagnosis === "stress_event"
        ? `Your longest run is ${intake.longestRun}km — ${volume.longRunPct}% of weekly volume. That's above the threshold where a long run stops being aerobic development and starts being an accumulated stress event. It explains the Sunday fatigue.`
        : volume.longRunDiagnosis === "underdone"
          ? `Your longest run is ${intake.longestRun}km — ${volume.longRunPct}% of weekly volume. It should be closer to 28–33% to drive meaningful aerobic adaptation.`
          : `Your longest run is ${intake.longestRun}km — ${volume.longRunPct}% of weekly volume. That ratio is solid.`;
    parts.push(longRunVerdict);
  }

  if (volume.qualityRatioPct != null) {
    const qualityLine =
      volume.qualityDiagnosis === "too_much_intensity"
        ? `${intake.qualitySessionsPerWeek} of your ${intake.sessionsPerWeek} sessions are quality work — ${volume.qualityRatioPct}% intensity ratio. That's too high. Elite athletes sit at 15–20%.`
        : volume.qualityDiagnosis === "no_quality"
          ? `You have no structured quality sessions, which means your fitness will plateau without intervention.`
          : `${intake.qualitySessionsPerWeek} quality session across ${intake.sessionsPerWeek} total puts your intensity ratio at ${volume.qualityRatioPct}% — that's close to correct.`;
    parts.push(qualityLine);
  }

  // Named insight based on weakness
  const weaknessLine = {
    "Aerobic base": `Your named limiter — aerobic base — is consistent with the pattern. The problem isn't effort. It's that your easy runs aren't easy, so your aerobic stimulus is weaker than it looks on paper.`,
    "Threshold fitness": `Your named limiter is threshold fitness — the ceiling on your sustained hard effort. That's the highest-ROI thing to train at your current profile.`,
    "Fatigue resistance": `Fatigue resistance as a limiter almost always means your training doesn't replicate race-end demands. You're fit — but not specifically fit for the final 20% of the event.`,
    "Strength": `Strength as a limiter at your volume typically means injury risk and form breakdown under fatigue, not a lack of power. One targeted session per week changes this.`,
    "Durability / injury resilience": `Durability as your limiter means the plan needs to protect your ability to train consistently above everything else. Load management is the performance strategy.`,
    "Race-specific conditioning": `Race-specific conditioning means your aerobic base is solid but you haven't converted it to event-specific output. That's what this block addresses.`,
    "Speed": `Speed development at endurance distances is mostly a byproduct of aerobic development — but targeted strides and economy work accelerates it meaningfully.`,
  }[intake.weakness];

  if (weaknessLine) parts.push(weaknessLine);

  return parts.join(" ");
}

// ── Main export ───────────────────────────────────────────────────────────────
export function buildPerformanceAudit(intake) {
  const volume = analyseVolume(intake);
  const gap = analyseBenchmarkGap(intake);
  const insights = buildInsights(intake, volume, gap);
  const summary = buildSummaryParagraph(intake, volume, gap);

  return {
    summary,         // the "screenshot paragraph"
    insights,        // array of { type, headline, detail }
    volume,          // raw numbers for rendering
    gap,             // benchmark gap analysis
  };
}
