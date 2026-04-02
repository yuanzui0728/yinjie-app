import { useQuery } from "@tanstack/react-query";
import { HardDriveDownload, LayoutPanelTop, ShieldCheck, Sparkles } from "lucide-react";
import { getSystemStatus } from "@yinjie/contracts";
import { Card, SectionHeading, StatusPill } from "@yinjie/ui";

const runtimeHighlights = [
  {
    title: "桌面运行时",
    description: "Tauri + Rust 负责安装包、自动更新、密钥管理、日志入口与本地守护。",
    icon: LayoutPanelTop,
  },
  {
    title: "核心服务",
    description: "新的 Rust Core API 将承接现有 /api 与 /chat 语义，最终替换原型期 Node 服务。",
    icon: ShieldCheck,
  },
  {
    title: "推理调度",
    description: "Inference Gateway 会统一承接云端与本地兼容端点，控制并发、重试、熔断和队列。",
    icon: Sparkles,
  },
  {
    title: "自部署交付",
    description: "安装包即产品，用户只需配置 API Key 或本地端点，不依赖 SaaS 控制台。",
    icon: HardDriveDownload,
  },
];

export function DashboardPage() {
  const statusQuery = useQuery({
    queryKey: ["system-status"],
    queryFn: () => getSystemStatus(import.meta.env.VITE_CORE_API_BASE_URL),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(249,115,22,0.22),rgba(251,191,36,0.04)_35%,rgba(15,23,32,0.78)_78%)]">
          <div className="max-w-2xl space-y-5">
            <SectionHeading>Production Refactor</SectionHeading>
            <h1 className="text-4xl font-semibold leading-tight text-white">
              让隐界从原型代码进入真正可交付、可更新、可维护的单用户 AI 世界运行时。
            </h1>
            <p className="max-w-xl text-base leading-8 text-[color:var(--text-secondary)]">
              当前版本优先完成架构收口：workspace、shared contracts、桌面壳、Rust 服务骨架和新的 UI 设计系统。
              业务逻辑仍以旧系统为准，新系统专注承接生产级运行方式。
            </p>
            <div className="flex flex-wrap gap-3">
              <StatusPill tone="healthy">Monorepo Ready</StatusPill>
              <StatusPill tone="warning">Core API Migration Pending</StatusPill>
              <StatusPill>Typed Contracts Enabled</StatusPill>
            </div>
          </div>
        </Card>

        <Card className="bg-[color:var(--surface-secondary)]">
          <SectionHeading>系统状态</SectionHeading>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-sm text-[color:var(--text-secondary)]">核心服务</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xl font-semibold">
                  {statusQuery.data?.coreApi.version ?? "未连接"}
                </div>
                <StatusPill tone={statusQuery.data?.coreApi.healthy ? "healthy" : "warning"}>
                  {statusQuery.isLoading
                    ? "检测中"
                    : statusQuery.data?.coreApi.healthy
                    ? "在线"
                    : "离线"}
                </StatusPill>
              </div>
              <div className="mt-3 text-sm text-[color:var(--text-muted)]">
                {statusQuery.error instanceof Error
                  ? statusQuery.error.message
                  : statusQuery.data?.coreApi.message ?? "等待 Rust Core API 接入。"}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="text-sm text-[color:var(--text-secondary)]">数据库</div>
                <div className="mt-2 text-lg font-semibold">
                  {statusQuery.data?.database.connected ? "已连接" : "未初始化"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="text-sm text-[color:var(--text-secondary)]">推理网关</div>
                <div className="mt-2 text-lg font-semibold">
                  {statusQuery.data?.inferenceGateway.healthy ? "可用" : "待接入"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {runtimeHighlights.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="bg-[color:var(--surface-secondary)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[color:var(--brand-secondary)]">
              <Icon size={22} />
            </div>
            <div className="mt-5 text-lg font-semibold">{title}</div>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">{description}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeading>保留不动的业务面</SectionHeading>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--text-secondary)]">
            <li>聊天、朋友圈、发现页、摇一摇、好友申请、世界调度的业务规则不变。</li>
            <li>现有 `/api/*` 路由语义与 `/chat` WebSocket 事件命名不变。</li>
            <li>旧 `api/`、`web/`、`admin/` 代码保留在仓库，作为行为对照和迁移来源。</li>
          </ul>
        </Card>

        <Card>
          <SectionHeading>当前已落地的重构层</SectionHeading>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--text-secondary)]">
            <li>根级 `pnpm workspace + turbo` 已接入，后续可统一构建、校验和发版。</li>
            <li>共享契约包已开始收口系统接口和 WebSocket 事件常量。</li>
            <li>新 UI 已切入 shared tokens / components，不再继续堆页面内联样式。</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
