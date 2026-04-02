import { Card, SectionHeading, StatusPill } from "@yinjie/ui";

const deliverables = [
  "桌面安装包、自动更新、系统密钥存储",
  "Rust Core API、Inference Gateway、SQLite WAL",
  "共享 typed contracts 与前后端统一 schema",
  "窄屏社交壳 + 桌面增强的正式设计系统",
];

export function SettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <Card>
        <SectionHeading>重构默认项</SectionHeading>
        <div className="mt-4 flex flex-wrap gap-3">
          <StatusPill tone="healthy">Cross-platform Desktop</StatusPill>
          <StatusPill>Rust-first Runtime</StatusPill>
          <StatusPill>OpenAI-compatible Providers</StatusPill>
          <StatusPill>Self-hosted Single User</StatusPill>
        </div>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-secondary)]">
          这一版只做生产级结构升级，不改变角色、消息、内容流、调度、路由语义等业务规则。
          所有运行级增强都围绕可部署、可升级、可诊断、可承压来设计。
        </p>
      </Card>

      <Card className="bg-[color:var(--surface-secondary)]">
        <SectionHeading>交付目标</SectionHeading>
        <div className="mt-4 grid gap-3">
          {deliverables.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[color:var(--text-secondary)]"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
