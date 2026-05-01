/**
 * Sends the generated training programme as a PDF attachment via Resend.
 * No-op (with warning) if RESEND_API_KEY is not set.
 */
export async function sendProgramEmail({ to, firstName, programLength, pdfBuffer }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[emailService] RESEND_API_KEY not set — skipping programme email");
    return { sent: false, reason: "no_api_key" };
  }

  const from = process.env.RESEND_FROM || "KJ Performance <onboarding@resend.dev>";
  const name = (firstName || "there").trim();
  const subject = `Your ${programLength}-Week Training Programme`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222">
      <div style="background:#1a1a1a;padding:32px 24px;border-radius:8px 8px 0 0">
        <p style="color:#ff8a1a;font-size:11px;font-weight:700;letter-spacing:2px;margin:0 0 8px">KJ PERFORMANCE PLANNER</p>
        <h1 style="color:#fff;font-size:22px;margin:0">Your ${programLength}-Week Programme is Ready</h1>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px">
        <p>Hi ${name},</p>
        <p>Your personalised <strong>${programLength}-week training programme</strong> is attached as a PDF. Open it on any device, print it, or save it to your training app.</p>
        <p style="color:#555;font-size:13px">The programme was built using the Norwegian Method framework, periodised across your goal timeline and personalised to your profile.</p>
        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0">
        <p style="font-size:12px;color:#888">Questions? Reply to this email.<br>— KJ Performance</p>
      </div>
    </div>
  `;

  const body = {
    from,
    to: [to],
    subject,
    html,
    attachments: [
      {
        filename: `KJ-Performance-${programLength}Week-Programme.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[emailService] Resend error", res.status, err);
    return { sent: false, reason: "resend_error" };
  }

  console.log(`[emailService] Programme email sent to ${to}`);
  return { sent: true };
}
