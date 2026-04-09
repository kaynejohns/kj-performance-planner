interface Props {
  step: number;
  total: number;
}

export default function ProgressIndicator({ step, total }: Props) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#121212_0%,#0f0f0f_100%)] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.4)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff8a1a]">Performance Build System</p>
        <p className="text-xs text-[#b7b7b7]">Step {step} / {total}</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#2b2b2b]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#ff7a00] to-[#ffad53] shadow-[0_0_16px_rgba(255,138,26,0.55)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
