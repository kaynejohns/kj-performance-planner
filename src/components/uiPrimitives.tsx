import type { ButtonHTMLAttributes, ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff8a1a]">
      {children}
    </p>
  );
}

export function DarkCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(255,138,26,0.06),transparent_42%),linear-gradient(180deg,#1a1a1a_0%,#111111_100%)] shadow-[0_20px_45px_rgba(0,0,0,0.45)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#141414] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9f9f9f]">{label}</p>
      <p className="mt-1.5 text-sm font-medium leading-snug text-white">{value}</p>
    </div>
  );
}

export function AccentPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#ff8a1a]/40 bg-[#ff8a1a]/10 px-3 py-1 text-xs font-medium text-[#ffd5ac]">
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-[#ff8a1a] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_10px_26px_rgba(255,138,26,0.34)] transition duration-200 hover:-translate-y-[1px] hover:bg-[#ff951f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a1a]/45 disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
