import { equipmentOptions, eventOptions, goalOptions, levelOptions, sportOptions, weaknessOptions } from "../lib/validation";
import type { IntakeInput } from "../lib/types";
import { AccentPill, SectionLabel } from "./uiPrimitives";

const labelClass = "mb-1.5 block text-sm font-medium text-[#f0f0f0]";
const inputClass = "w-full rounded-xl border border-white/12 bg-[#141414] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-[#6f6f6f] focus:border-[#ff8a1a] focus:shadow-[0_0_0_3px_rgba(255,138,26,0.18)]";

export default function IntakeForm({
  step,
  intake,
  setIntake,
}: {
  step: number;
  intake: IntakeInput;
  setIntake: (v: IntakeInput) => void;
}) {
  const set = <K extends keyof IntakeInput>(k: K, v: IntakeInput[K]) => setIntake({ ...intake, [k]: v });
  const benchmarkLabelMap: Record<string, string> = {
    "5k": "5k PB",
    "10k": "10k PB",
    "Half Marathon": "Half Marathon PB",
    Marathon: "Marathon PB",
    HYROX: "HYROX PB",
  };
  const goalLabelMap: Record<string, string> = {
    "5k": "Goal 5k time",
    "10k": "Goal 10k time",
    "Half Marathon": "Goal Half Marathon time",
    Marathon: "Goal Marathon time",
    HYROX: "Goal HYROX time",
  };
  const toggleEquipment = (item: string) => {
    const current = intake.equipmentAccess || [];
    set("equipmentAccess", current.includes(item) ? current.filter((x) => x !== item) : [...current, item]);
  };

  return (
    <div className="space-y-4 lg:space-y-5">
      <SectionLabel>Intake Step {step}</SectionLabel>
      {step === 1 && (
        <>
          <div><label className={labelClass}>Sport</label><select className={inputClass} value={intake.sport} onChange={(e) => set("sport", e.target.value as IntakeInput["sport"])}>{sportOptions.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><label className={labelClass}>Event type</label><select className={inputClass} value={intake.eventType} onChange={(e) => set("eventType", e.target.value as IntakeInput["eventType"])}>{eventOptions.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div>
            <label className={labelClass}>{benchmarkLabelMap[intake.eventType] || "Current benchmark / PB"}</label>
            <input
              className={inputClass}
              value={intake.currentBenchmark}
              onChange={(e) => set("currentBenchmark", e.target.value)}
              placeholder="e.g. 22:00 or No current PB"
            />
          </div>
          <div>
            <label className={labelClass}>{goalLabelMap[intake.eventType] || "Goal benchmark / time"}</label>
            <input
              className={inputClass}
              value={intake.goalBenchmark}
              onChange={(e) => set("goalBenchmark", e.target.value)}
              placeholder="e.g. 20:30"
            />
          </div>
          <div><label className={labelClass}>Current level</label><select className={inputClass} value={intake.level} onChange={(e) => set("level", e.target.value as IntakeInput["level"])}>{levelOptions.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><label className={labelClass}>Primary goal</label><select className={inputClass} value={intake.goal} onChange={(e) => set("goal", e.target.value)}>{goalOptions.map((x) => <option key={x}>{x}</option>)}</select></div>
        </>
      )}
      {step === 2 && (
        <>
          <div><label className={labelClass}>Sessions per week</label><input className={inputClass} type="number" min={1} value={intake.sessionsPerWeek} onChange={(e) => set("sessionsPerWeek", Number(e.target.value))} /></div>
          <div><label className={labelClass}>Hours per week</label><input className={inputClass} type="number" min={1} step={0.5} value={intake.hoursPerWeek} onChange={(e) => set("hoursPerWeek", Number(e.target.value))} /></div>
          {["5k", "10k", "Half Marathon", "Marathon"].includes(intake.eventType) && (
            <>
              <div><label className={labelClass}>Current weekly km</label><input className={inputClass} type="number" min={0} value={intake.weeklyKm || 0} onChange={(e) => set("weeklyKm", Number(e.target.value))} /></div>
              <div><label className={labelClass}>Current longest run (km)</label><input className={inputClass} type="number" min={0} value={intake.longestRun || 0} onChange={(e) => set("longestRun", Number(e.target.value))} /></div>
            </>
          )}
          <div><label className={labelClass}>Quality sessions per week</label><input className={inputClass} type="number" min={0} max={7} value={intake.qualitySessionsPerWeek || 0} onChange={(e) => set("qualitySessionsPerWeek", Number(e.target.value))} /></div>
          <div><label className={labelClass}>Timeline (weeks, optional)</label><input className={inputClass} type="number" min={0} value={intake.timelineWeeks || 0} onChange={(e) => set("timelineWeeks", Number(e.target.value) || undefined)} /></div>
          <div>
            <label className={labelClass}>Equipment access</label>
            <div className="flex flex-wrap gap-2">
              {equipmentOptions.map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => toggleEquipment(x)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    intake.equipmentAccess?.includes(x)
                      ? "border-[#ff8a1a]/60 bg-[#ff8a1a]/15 text-[#ffd9b5]"
                      : "border-white/15 bg-[#121212] text-[#b8b8b8] hover:border-[#ff8a1a]/40"
                  }`}
                >
                  {x}
                </button>
              ))}
            </div>
            <div className="mt-2"><AccentPill>Select all that apply</AccentPill></div>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <div><label className={labelClass}>Main weakness / limiter</label><select className={inputClass} value={intake.weakness} onChange={(e) => set("weakness", e.target.value as IntakeInput["weakness"])}>{weaknessOptions.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><label className={labelClass}>Injury / training history</label><textarea className={inputClass} rows={3} value={intake.injuryHistory || ""} onChange={(e) => set("injuryHistory", e.target.value)} /></div>
          <div><label className={labelClass}>Priority note (optional)</label><textarea className={inputClass} rows={2} value={intake.priority || ""} onChange={(e) => set("priority", e.target.value)} /></div>
        </>
      )}
    </div>
  );
}
