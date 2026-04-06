type DesktopRuntimeActionsProps = {
  title: string;
  probeLabel: string;
  startLabel: string;
  restartLabel: string;
  stopLabel?: string;
  message: string;
  errorMessage?: string | null;
  busy?: boolean;
  onProbe: () => void;
  onStart: () => void;
  onRestart: () => void;
  onStop?: () => void;
};

export function DesktopRuntimeActions({
  title,
  probeLabel,
  startLabel,
  restartLabel,
  stopLabel,
  message,
  errorMessage,
  busy = false,
  onProbe,
  onStart,
  onRestart,
  onStop,
}: DesktopRuntimeActionsProps) {
  return (
    <section className="rounded-[28px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-5 shadow-[var(--shadow-section)]">
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onProbe}
          disabled={busy}
          className="rounded-full border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {probeLabel}
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="rounded-full bg-[var(--brand-gradient)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {startLabel}
        </button>
        <button
          type="button"
          onClick={onRestart}
          disabled={busy}
          className="rounded-full border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {restartLabel}
        </button>
        {onStop ? (
          <button
            type="button"
            onClick={onStop}
            disabled={busy}
            className="rounded-full border border-[#7f1d1d] bg-[#3f1113] px-4 py-2 text-sm text-[#fecaca] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {stopLabel ?? "Stop"}
          </button>
        ) : null}
      </div>
      <div className="mt-4 text-xs leading-6 text-[color:var(--text-muted)]">{message}</div>
      {errorMessage ? <div className="mt-3 text-sm text-[#fda4af]">{errorMessage}</div> : null}
    </section>
  );
}
