import { Link } from "@tanstack/react-router";
import { ChevronRight, FileText, ScrollText, Settings, Shield, UserPlus } from "lucide-react";
import { AppPage, cn } from "@yinjie/ui";
import { AvatarChip } from "../components/avatar-chip";
import { TabPageTopBar } from "../components/tab-page-top-bar";
import { useWorldOwnerStore } from "../store/world-owner-store";

type ProfileEntry = {
  label: string;
  description: string;
  icon: typeof Settings;
  to: "/profile/settings" | "/friend-requests" | "/legal/privacy" | "/legal/terms" | "/legal/community";
};

const primaryEntries: ProfileEntry[] = [
  {
    label: "设置",
    description: "调整资料、专属 API Key 和世界配置。",
    icon: Settings,
    to: "/profile/settings",
  },
  {
    label: "好友请求",
    description: "处理新的靠近，决定谁可以进入你的世界。",
    icon: UserPlus,
    to: "/friend-requests",
  },
];

const legalEntries: ProfileEntry[] = [
  {
    label: "隐私政策",
    description: "了解世界数据与个人信息的使用方式。",
    icon: Shield,
    to: "/legal/privacy",
  },
  {
    label: "用户协议",
    description: "查看客户端与世界实例的基础使用约定。",
    icon: ScrollText,
    to: "/legal/terms",
  },
  {
    label: "社区规范",
    description: "确认角色互动与内容发布的基本边界。",
    icon: FileText,
    to: "/legal/community",
  },
];

export function ProfilePage() {
  const username = useWorldOwnerStore((state) => state.username);
  const avatar = useWorldOwnerStore((state) => state.avatar);
  const signature = useWorldOwnerStore((state) => state.signature);
  const hasCustomApiKey = useWorldOwnerStore((state) => state.hasCustomApiKey);
  const createdAt = useWorldOwnerStore((state) => state.createdAt);
  const onboardingCompleted = useWorldOwnerStore((state) => state.onboardingCompleted);

  return (
    <AppPage className="space-y-4">
      <TabPageTopBar
        eyebrow="世界主人"
        title="我"
        subtitle="管理自己的资料、入口和安全边界"
        titleAlign="center"
      />

      <Link
        to="/profile/settings"
        className="block overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,246,232,0.94)_42%,rgba(240,251,245,0.96))] p-5 shadow-[var(--shadow-section)] transition-[transform,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
      >
        <div className="flex items-start gap-4">
          <AvatarChip name={username ?? "世界主人"} src={avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="inline-flex rounded-full border border-[rgba(255,179,71,0.24)] bg-white/78 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[color:var(--brand-secondary)]">
              My World
            </div>
            <div className="mt-3 text-2xl font-semibold text-[color:var(--text-primary)]">{username ?? "世界主人"}</div>
            <div className="mt-2 line-clamp-2 text-sm leading-7 text-[color:var(--text-secondary)]">
              {signature?.trim() || "这个服务端实例只属于你，所有角色和关系都会围绕你继续展开。"}
            </div>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white/82 text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)]">
            <Settings size={18} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ProfileChip label="状态" value={onboardingCompleted ? "世界已启动" : "等待初始化"} />
          <ProfileChip label="Provider" value={hasCustomApiKey ? "专属 API Key" : "实例级默认"} />
          <ProfileChip label="加入时间" value={formatJoinDate(createdAt)} />
        </div>
      </Link>

      <ProfileEntryGroup title="常用入口" entries={primaryEntries} />
      <ProfileEntryGroup title="协议与规范" entries={legalEntries} />
    </AppPage>
  );
}

function ProfileEntryGroup({ title, entries }: { title: string; entries: ProfileEntry[] }) {
  return (
    <section className="space-y-3">
      <div className="px-1 text-xs font-medium tracking-[0.14em] text-[color:var(--text-muted)]">{title}</div>
      <div className="overflow-hidden rounded-[26px] border border-white/80 bg-white/88 shadow-[var(--shadow-section)]">
        {entries.map((entry, index) => {
          const Icon = entry.icon;

          return (
            <Link
              key={entry.to}
              to={entry.to}
              className={cn(
                "flex items-center gap-3 px-4 py-4 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-[color:var(--surface-soft)]",
                index > 0 ? "border-t border-[color:var(--border-faint)]" : undefined,
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(255,138,61,0.1)] text-[color:var(--brand-primary)]">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium text-[color:var(--text-primary)]">{entry.label}</div>
                <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">{entry.description}</div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-[color:var(--text-dim)]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ProfileChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/82 px-3 py-3 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[color:var(--text-primary)]">{value}</div>
    </div>
  );
}

function formatJoinDate(value: string | null) {
  if (!value) {
    return "今天";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "今天";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}
