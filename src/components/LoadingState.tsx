export default function LoadingState({ phase }: { phase: string }) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#141414] p-5">
      <p className="text-sm text-[#ff9b3d]">{phase}</p>
      <div className="h-6 animate-pulse rounded-lg bg-[#262626]" />
      <div className="h-24 animate-pulse rounded-lg bg-[#262626]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 animate-pulse rounded-lg bg-[#262626]" />
        <div className="h-16 animate-pulse rounded-lg bg-[#262626]" />
      </div>
      <div className="h-20 animate-pulse rounded-lg bg-[#262626]" />
    </div>
  );
}
