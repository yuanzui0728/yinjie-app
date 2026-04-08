import { ErrorBlock, InlineNotice, SectionHeading } from "@yinjie/ui";

export function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading>World Owner</SectionHeading>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          The single-user world migration removed instance-level user management.
        </p>
      </div>

      <div className="space-y-4 rounded-[28px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-console)] p-6 shadow-[var(--shadow-overlay)]">
        <InlineNotice tone="info">
          This admin console now focuses on instance operations, provider setup, diagnostics, backups,
          and character management.
        </InlineNotice>
        <ErrorBlock message="Users page has been retired in the single-world architecture." />
      </div>
    </div>
  );
}
