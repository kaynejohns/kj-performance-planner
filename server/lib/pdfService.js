import PDFDocument from "pdfkit";
import { buildPerformanceAudit } from "./performanceAudit.js";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  orange:    "#E8750A",
  black:     "#111111",
  charcoal:  "#2C2C2C",
  body:      "#3D3D3D",
  mid:       "#6B6B6B",
  muted:     "#9A9A9A",
  rule:      "#E2E2E2",
  bg:        "#FAFAFA",
  cardBg:    "#F4F4F4",
  white:     "#FFFFFF",
  // insight type accents
  warning:   "#C0392B",
  flag:      "#E8750A",
  diagnosis: "#1A7A4A",
  reality:   "#2C5F8A",
};

const PAGE = { w: 595.28, h: 841.89 };
const M = { l: 52, r: 52, t: 52, b: 52 };
const W = PAGE.w - M.l - M.r; // 491.28

// ── Shared helpers ────────────────────────────────────────────────────────────
function newPage(doc) {
  doc.addPage({ size: "A4", margins: { top: M.t, bottom: M.b, left: M.l, right: M.r } });
  // White background
  doc.rect(0, 0, PAGE.w, PAGE.h).fill(C.white);
  doc.y = M.t;
}

function rule(doc, y, color = C.rule, thickness = 0.5) {
  doc.moveTo(M.l, y).lineTo(M.l + W, y).lineWidth(thickness).stroke(color);
}

function sectionLabel(doc, text, y) {
  doc.fill(C.orange).fontSize(7).font("Helvetica-Bold")
    .text(text.toUpperCase(), M.l, y, { width: W, characterSpacing: 1.2 });
  return doc.y + 4;
}

function h1(doc, text, y) {
  doc.fill(C.black).fontSize(22).font("Helvetica-Bold")
    .text(text, M.l, y, { width: W });
  return doc.y + 6;
}

function h2(doc, text, y) {
  doc.fill(C.black).fontSize(14).font("Helvetica-Bold")
    .text(text, M.l, y, { width: W });
  return doc.y + 4;
}

function bodyText(doc, text, y, opts = {}) {
  doc.fill(C.body).fontSize(9).font("Helvetica")
    .text(text, M.l, y, { width: W, lineGap: 2, ...opts });
  return doc.y + 4;
}

function mutedText(doc, text, y, opts = {}) {
  doc.fill(C.mid).fontSize(8).font("Helvetica")
    .text(text, M.l, y, { width: W, lineGap: 1.5, ...opts });
  return doc.y + 3;
}

function safeY(doc, neededHeight = 120) {
  if (doc.y + neededHeight > PAGE.h - M.b - 20) {
    newPage(doc);
  }
  return doc.y;
}

// ── Cover page ────────────────────────────────────────────────────────────────
function renderCover(doc, firstName, intake, programLength) {
  // Full dark background
  doc.rect(0, 0, PAGE.w, PAGE.h).fill(C.charcoal);

  // Orange left stripe
  doc.rect(0, 0, 6, PAGE.h).fill(C.orange);

  // Top label
  doc.fill(C.orange).fontSize(8).font("Helvetica-Bold")
    .text("KJ PERFORMANCE", M.l + 12, 60, { characterSpacing: 2 });

  // Main title
  doc.fill(C.white).fontSize(36).font("Helvetica-Bold")
    .text(`${programLength}-Week`, M.l + 12, 90, { width: W - 12 });
  doc.fill(C.white).fontSize(36).font("Helvetica-Bold")
    .text("Training", M.l + 12, doc.y, { width: W - 12 });
  doc.fill(C.orange).fontSize(36).font("Helvetica-Bold")
    .text("Programme", M.l + 12, doc.y, { width: W - 12 });

  // Divider
  const divY = doc.y + 20;
  doc.moveTo(M.l + 12, divY).lineTo(M.l + 12 + 60, divY)
    .lineWidth(2).stroke(C.orange);

  // Prepared for
  if (firstName) {
    doc.fill(C.muted).fontSize(9).font("Helvetica")
      .text("Prepared for", M.l + 12, divY + 16, { characterSpacing: 0.5 });
    doc.fill(C.white).fontSize(16).font("Helvetica-Bold")
      .text(firstName, M.l + 12, doc.y + 2);
  }

  // Snapshot card — lower third
  const cardY = PAGE.h - 310;
  doc.roundedRect(M.l + 12, cardY, W - 24, 260, 6).fill("#1A1A1A");

  doc.fill(C.orange).fontSize(7).font("Helvetica-Bold")
    .text("ATHLETE SNAPSHOT", M.l + 28, cardY + 18, { characterSpacing: 1.5 });

  // Thin rule inside card
  doc.moveTo(M.l + 28, cardY + 32).lineTo(M.l + W - 28, cardY + 32)
    .lineWidth(0.5).stroke("#333333");

  const snapItems = [
    ["Sport / Event",    `${intake.sport}  —  ${intake.eventType}`],
    ["Current",          intake.currentBenchmark || "Not provided"],
    ["Target",           intake.goalBenchmark    || "Not provided"],
    ["Level",            intake.level],
    ["Sessions / week",  `${intake.sessionsPerWeek} sessions`],
    ["Weekly volume",    intake.weeklyKm ? `${intake.weeklyKm} km` : `${intake.hoursPerWeek}h`],
    ["Main limiter",     intake.weakness],
  ];

  let sy = cardY + 42;
  snapItems.forEach(([label, value], i) => {
    // alternate row tint
    if (i % 2 === 0) {
      doc.rect(M.l + 16, sy - 3, W - 8, 18).fill("#1E1E1E");
    }
    doc.fill(C.muted).fontSize(7.5).font("Helvetica-Bold")
      .text(label.toUpperCase(), M.l + 28, sy, { width: 120, characterSpacing: 0.5 });
    doc.fill(C.white).fontSize(8.5).font("Helvetica")
      .text(value, M.l + 28 + 130, sy, { width: W - 180 });
    sy += 19;
  });

  // Footer
  doc.fill("#404040").fontSize(7).font("Helvetica")
    .text(
      `KJ Performance  ·  ${new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`,
      M.l + 12, PAGE.h - 32, { width: W - 24 }
    );
}

// ── Intensity guide page ──────────────────────────────────────────────────────
function renderIntensityGuide(doc) {
  newPage(doc);

  let y = M.t;
  y = sectionLabel(doc, "Reference Guide", y);
  y = h1(doc, "Training Intensity Zones", y);

  doc.fill(C.mid).fontSize(9).font("Helvetica")
    .text(
      "Every session in this programme sits in one of these zones. The wrong intensity on the wrong day is the most common training error — easy days too hard, quality days not structured enough.",
      M.l, y, { width: W, lineGap: 2 }
    );
  y = doc.y + 16;

  const zones = [
    {
      label:    "Zone 1 — Easy / Recovery",
      accent:   "#1A7A4A",
      tag:      "EASY",
      feel:     "Fully conversational. You can hold a phone call or sing. Nose breathing is possible. Should feel almost embarrassingly slow.",
      metrics:  "60–72% max HR  ·  RPE 2–4",
      talkTest: "Talk test: sing 4 lines of a song — if you can't finish them, slow down.",
      usedFor:  "All easy runs, long runs, warm-ups, cool-downs.",
    },
    {
      label:    "LT1 — Aerobic Threshold",
      accent:   C.orange,
      tag:      "THRESHOLD",
      feel:     "Full sentences still possible but you notice your breathing. Slight, controlled discomfort. You could sustain this for 60–90 min.",
      metrics:  "75–83% max HR  ·  RPE 5–6",
      talkTest: "Talk test: short sentences fine, long rambling ones become difficult.",
      usedFor:  "Threshold intervals (e.g. 3 × 8 min), tempo efforts, cruise intervals.",
    },
    {
      label:    "LT2 — Race Pace / Lactate Threshold",
      accent:   "#C0392B",
      tag:      "RACE PACE",
      feel:     "Short phrases only — 2 to 4 words between breaths. Breathing is laboured. Sustainable for 20–40 min maximum.",
      metrics:  "84–91% max HR  ·  RPE 7–8",
      talkTest: "Talk test: single words at most. Full sentences mean you're too easy.",
      usedFor:  "Race-pace intervals, race simulations, sharpening sessions.",
    },
    {
      label:    "Strength — Gym / Durability",
      accent:   "#2C5F8A",
      tag:      "STRENGTH",
      feel:     "Controlled load throughout. Form is always the priority. Leave 2–3 reps in reserve per set.",
      metrics:  "N/A — use RPE and technique quality",
      talkTest: "If form breaks, the set ends. Log your weights and aim for 2.5–5% monthly progression.",
      usedFor:  "All strength and durability sessions in this programme.",
    },
  ];

  zones.forEach(z => {
    y = safeY(doc, 90);

    // Left accent bar
    doc.rect(M.l, y, 3, 72).fill(z.accent);

    // Tag pill
    doc.roundedRect(M.l + 12, y, 58, 14, 3).fill(z.accent + "20");
    doc.fill(z.accent).fontSize(6.5).font("Helvetica-Bold")
      .text(z.tag, M.l + 14, y + 4, { width: 54, align: "center", characterSpacing: 0.8 });

    // Zone title
    doc.fill(C.black).fontSize(10).font("Helvetica-Bold")
      .text(z.label, M.l + 76, y + 1, { width: W - 76 });

    // Feel
    doc.fill(C.body).fontSize(8.5).font("Helvetica")
      .text(z.feel, M.l + 12, y + 20, { width: W - 12, lineGap: 1.5 });
    let lineY = doc.y + 4;

    // Metrics + talk test on one line
    doc.fill(C.mid).fontSize(7.5).font("Helvetica")
      .text(`${z.metrics}`, M.l + 12, lineY, { width: W - 12 });
    lineY = doc.y + 2;
    doc.fill(C.mid).fontSize(7.5).font("Helvetica-Oblique")
      .text(z.talkTest, M.l + 12, lineY, { width: W - 12 });
    lineY = doc.y + 2;
    doc.fill(C.muted).fontSize(7.5).font("Helvetica")
      .text(`Used for: ${z.usedFor}`, M.l + 12, lineY, { width: W - 12 });

    y = doc.y + 18;
    rule(doc, y - 8);
  });

  // Field test box
  y = safeY(doc, 100);
  doc.roundedRect(M.l, y, W, 90, 4).fill(C.cardBg);
  doc.rect(M.l, y, 3, 90).fill(C.orange);

  doc.fill(C.orange).fontSize(7.5).font("Helvetica-Bold")
    .text("20-MINUTE FIELD TEST — HOW TO FIND YOUR THRESHOLD", M.l + 14, y + 12, { width: W - 24, characterSpacing: 0.6 });

  const steps = [
    "Warm up 15 minutes at easy Zone 1 pace.",
    "Run hard for exactly 20 minutes — as fast as you can sustain for the full duration. This is a time trial, not a sprint.",
    "Record your average heart rate for the final 10 minutes.",
    "That HR ≈ your LT2. Your LT1 HR ≈ 85–90% of that number.",
    "Repeat every 6–8 weeks to measure fitness gains.",
  ];

  let stepY = y + 28;
  steps.forEach((s, i) => {
    doc.fill(C.orange).fontSize(8).font("Helvetica-Bold").text(`${i + 1}.`, M.l + 14, stepY, { width: 14 });
    doc.fill(C.body).fontSize(8).font("Helvetica").text(s, M.l + 30, stepY, { width: W - 44 });
    stepY = doc.y + 3;
  });
}

// ── Performance audit page ────────────────────────────────────────────────────
function renderAuditPage(doc, intake) {
  newPage(doc);
  const audit = buildPerformanceAudit(intake);

  let y = M.t;
  y = sectionLabel(doc, "Personalised Analysis", y);
  y = h1(doc, "Your Performance Audit", y);
  rule(doc, y);
  y += 10;

  // Summary paragraph — highlighted box
  doc.roundedRect(M.l, y, W, 2, 1).fill(C.orange);
  y += 6;

  doc.fill(C.body).fontSize(9).font("Helvetica")
    .text(audit.summary, M.l, y, { width: W, lineGap: 3 });
  y = doc.y + 16;

  // Insights
  const accentMap = {
    warning:   C.warning,
    flag:      C.flag,
    diagnosis: C.diagnosis,
    reality:   C.reality,
  };
  const labelMap = {
    warning:   "ISSUE",
    flag:      "NOTE",
    diagnosis: "DIAGNOSIS",
    reality:   "REALITY CHECK",
  };

  audit.insights.forEach(insight => {
    y = safeY(doc, 80);
    const ac = accentMap[insight.type] || C.mid;
    const lb = labelMap[insight.type] || "NOTE";

    // Left accent bar + card
    doc.roundedRect(M.l, y, W, 14, 0).fill(ac + "12");
    doc.rect(M.l, y, 3, 14).fill(ac);

    // Type label
    doc.fill(ac).fontSize(6.5).font("Helvetica-Bold")
      .text(lb, M.l + 10, y + 4, { characterSpacing: 1 });

    // Headline
    doc.fill(C.black).fontSize(8.5).font("Helvetica-Bold")
      .text(insight.headline, M.l + 62, y + 3, { width: W - 70 });

    y += 18;
    doc.fill(C.body).fontSize(8.5).font("Helvetica")
      .text(insight.detail, M.l + 10, y, { width: W - 10, lineGap: 2 });
    y = doc.y + 12;
    rule(doc, y - 4);
  });
}

// ── Week page ─────────────────────────────────────────────────────────────────
function renderWeek(doc, week, isFirst) {
  if (!isFirst) newPage(doc);

  let y = M.t;

  // Week header — clean, no filled bar
  doc.fill(C.orange).fontSize(8).font("Helvetica-Bold")
    .text(`WEEK ${week.week}`, M.l, y, { characterSpacing: 1.5 });
  y = doc.y + 2;

  doc.fill(C.black).fontSize(16).font("Helvetica-Bold")
    .text(week.theme || `Week ${week.week}`, M.l, y, { width: W });
  y = doc.y + 2;

  // Objective
  if (week.objective) {
    doc.fill(C.mid).fontSize(9).font("Helvetica")
      .text(week.objective, M.l, y, { width: W, lineGap: 1.5 });
    y = doc.y + 6;
  }

  // Meta pills row
  const metaItems = [
    week.volumeTarget  && `Vol: ${week.volumeTarget}`,
    week.longRunTarget && `Long: ${week.longRunTarget}`,
    week.qualityTarget && `Quality: ${week.qualityTarget}`,
    week.strengthTarget && `Strength: ${week.strengthTarget}`,
  ].filter(Boolean);

  if (metaItems.length) {
    let px = M.l;
    metaItems.forEach(item => {
      const textW = item.length * 5.2 + 12;
      doc.roundedRect(px, y, textW, 14, 3).fill(C.cardBg);
      doc.fill(C.mid).fontSize(7).font("Helvetica").text(item, px + 6, y + 4, { width: textW - 12 });
      px += textW + 6;
    });
    y += 20;
  }

  // Guardrail
  if (week.guardrail) {
    doc.roundedRect(M.l, y, W, 16, 3).fill(C.orange + "15");
    doc.rect(M.l, y, 3, 16).fill(C.orange);
    doc.fill(C.orange).fontSize(7.5).font("Helvetica-Bold")
      .text("GUARDRAIL  ", M.l + 10, y + 5, { continued: true });
    doc.fill(C.body).fontSize(7.5).font("Helvetica")
      .text(week.guardrail, { width: W - 80 });
    y = doc.y + 10;
  }

  rule(doc, y);
  y += 10;

  // Sessions
  const sessions = Array.isArray(week.dailySessions) ? week.dailySessions : [];
  sessions.forEach((s, i) => {
    y = safeY(doc, 100);

    // Classify for accent
    const t = (s.type || "").toLowerCase();
    const isQuality = t.includes("threshold") || t.includes("lt1") || t.includes("lt2") ||
                      t.includes("race") || t.includes("hyrox") || t.includes("station");
    const isStrength = t.includes("strength") || t.includes("gym");
    const accentBar = isQuality ? C.orange : isStrength ? C.reality : C.rule;

    // Session card
    const cardStart = y;
    doc.roundedRect(M.l, y, W, 14, 0).fill(C.cardBg);
    doc.rect(M.l, y, 3, 14).fill(accentBar);

    // Day + title
    doc.fill(C.muted).fontSize(7.5).font("Helvetica-Bold")
      .text(s.day.toUpperCase(), M.l + 10, y + 4, { width: 52, characterSpacing: 0.5 });
    doc.fill(C.black).fontSize(8.5).font("Helvetica-Bold")
      .text(s.title || s.type, M.l + 64, y + 3, { width: W - 130 });
    if (s.duration) {
      doc.fill(C.mid).fontSize(8).font("Helvetica")
        .text(s.duration, M.l + 10, y + 3, { width: W - 20, align: "right" });
    }

    y += 18;

    // Structure steps
    if (Array.isArray(s.structure)) {
      s.structure.filter(Boolean).forEach(step => {
        doc.fill(C.orange).fontSize(8).font("Helvetica-Bold")
          .text("→", M.l + 10, y, { width: 10 });
        doc.fill(C.body).fontSize(8.5).font("Helvetica")
          .text(step, M.l + 22, y, { width: W - 32, lineGap: 1.5 });
        y = doc.y + 4;
      });
    }

    // Intensity guide
    if (s.intensityGuide) {
      doc.roundedRect(M.l + 10, y, W - 10, 12, 2).fill("#F0F0F0");
      doc.fill(C.mid).fontSize(7.5).font("Helvetica-Oblique")
        .text(`Intensity: ${s.intensityGuide}`, M.l + 16, y + 3, { width: W - 26 });
      y = doc.y + 6;
    }

    // Coach note
    if (s.coachNote) {
      doc.fill(C.orange).fontSize(7.5).font("Helvetica-Bold")
        .text("Coach  ", M.l + 10, y, { continued: true });
      doc.fill(C.body).fontSize(7.5).font("Helvetica-Oblique")
        .text(s.coachNote, { width: W - 20 });
      y = doc.y + 4;
    }

    // Why this why now — subdued, collapsible feel
    if (s.whyThisWhyNow) {
      doc.fill(C.muted).fontSize(7).font("Helvetica-Bold")
        .text("WHY THIS, WHY NOW", M.l + 10, y, { characterSpacing: 0.8 });
      y = doc.y + 1;
      doc.fill(C.muted).fontSize(7.5).font("Helvetica")
        .text(s.whyThisWhyNow, M.l + 10, y, { width: W - 20, lineGap: 1.5 });
      y = doc.y + 4;
    }

    // Bottom rule between sessions (not after last)
    if (i < sessions.length - 1) {
      rule(doc, y + 2, C.rule, 0.3);
      y += 10;
    } else {
      y += 4;
    }
  });

  // Progression markers
  if (Array.isArray(week.progressionMarkers) && week.progressionMarkers.length) {
    y = safeY(doc, 40);
    rule(doc, y);
    y += 8;
    doc.fill(C.muted).fontSize(7).font("Helvetica-Bold")
      .text("PROGRESSION CHECKS", M.l, y, { characterSpacing: 1 });
    y = doc.y + 2;
    week.progressionMarkers.forEach(m => {
      doc.fill(C.mid).fontSize(8).font("Helvetica")
        .text(`✓  ${m}`, M.l, y, { width: W });
      y = doc.y + 2;
    });
  }
}

// ── Footer on every page ──────────────────────────────────────────────────────
function renderFooters(doc, programLength) {
  const total = doc.bufferedPageRange().count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);
    // skip cover (dark page)
    if (i === 0) continue;
    doc.moveTo(M.l, PAGE.h - M.b + 8).lineTo(M.l + W, PAGE.h - M.b + 8)
      .lineWidth(0.4).stroke(C.rule);
    doc.fill(C.muted).fontSize(7).font("Helvetica")
      .text(
        `KJ Performance  ·  ${programLength}-Week Training Programme`,
        M.l, PAGE.h - M.b + 14, { width: W * 0.6 }
      );
    doc.fill(C.muted).fontSize(7).font("Helvetica")
      .text(`${i + 1} / ${total}`, M.l, PAGE.h - M.b + 14, { width: W, align: "right" });
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export function buildProgramPdf({ firstName, intake, weeks, programLength }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: M.t, bottom: M.b, left: M.l, right: M.r },
      bufferPages: true,
      autoFirstPage: false,
    });

    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // 1. Cover
    doc.addPage({ size: "A4" });
    doc.rect(0, 0, PAGE.w, PAGE.h).fill(C.white);
    renderCover(doc, firstName, intake, programLength);

    // 2. Intensity guide
    renderIntensityGuide(doc);

    // 3. Performance audit
    renderAuditPage(doc, intake);

    // 4. Weekly pages
    newPage(doc);
    weeks.forEach((week, i) => {
      renderWeek(doc, week, i === 0);
    });

    // 5. Footers on all inner pages
    renderFooters(doc, programLength);

    doc.end();
  });
}
