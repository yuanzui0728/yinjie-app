type SetupStep = {
  label: string;
  hint: string;
  ok: boolean;
};

export function SetupStepList({ steps }: { steps: SetupStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center justify-between rounded-[24px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,247,235,0.9))] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">STEP {index + 1}</div>
            <div className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">{step.label}</div>
            <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">{step.hint}</div>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-[11px] ${step.ok ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}
          >
            {step.ok ? "通过" : "处理中"}
          </div>
        </div>
      ))}
    </div>
  );
}
