import type { LeadInput } from "../lib/types";
import { SectionLabel } from "./uiPrimitives";

const inputClass = "w-full rounded-xl border border-white/12 bg-[#151515] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ff8a1a] focus:shadow-[0_0_0_3px_rgba(255,138,26,0.18)]";

export default function LeadCaptureStep({
  lead,
  setLead,
}: {
  lead: LeadInput;
  setLead: (v: LeadInput) => void;
}) {
  const set = <K extends keyof LeadInput>(k: K, v: LeadInput[K]) => setLead({ ...lead, [k]: v });
  return (
    <div className="space-y-4">
      <SectionLabel>Lead Capture</SectionLabel>
      <div className="rounded-xl border border-white/12 bg-[#171717] p-3">
        <p className="text-sm font-medium text-white">What happens after submit</p>
        <p className="mt-1 text-xs text-[#b6b6b6]">
          You will receive a personalized performance summary built from your intake, with clear strategic priorities.
        </p>
      </div>
      <p className="text-xs text-[#9f9f9f]">
        Trusted handling: your details stay private to coaching operations and are never sold.
      </p>
      <div>
        <label className="mb-1 block text-sm text-[#ececec]">First name</label>
        <input
          className={inputClass}
          maxLength={40}
          value={lead.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          placeholder="e.g. Alex"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-[#ececec]">Email</label>
        <input
          className={inputClass}
          type="email"
          autoComplete="email"
          value={lead.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@domain.com"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-[#cfcfcf]">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-white/30 bg-[#121212] accent-[#ff8a1a]"
          checked={Boolean(lead.consentToMarketing)}
          onChange={(e) => set("consentToMarketing", e.target.checked)}
        />
        I agree to receive updates and performance resources.
      </label>
    </div>
  );
}
