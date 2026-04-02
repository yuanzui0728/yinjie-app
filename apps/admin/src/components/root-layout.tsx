import { Outlet } from "@tanstack/react-router";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-transparent px-6 py-6 text-[color:var(--text-primary)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[28px] border border-white/10 bg-[color:var(--surface-console)] px-6 py-5 shadow-[var(--shadow-card)]">
          <div className="text-xs uppercase tracking-[0.28em] text-[color:var(--text-muted)]">Yinjie Admin Runtime</div>
          <div className="mt-2 text-3xl font-semibold">隐界本地后台</div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
