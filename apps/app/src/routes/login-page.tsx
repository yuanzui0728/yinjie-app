import { Link } from "@tanstack/react-router";
import { AppPage, AppSection, Button } from "@yinjie/ui";

export function LoginPage() {
  return (
    <AppPage className="flex min-h-full flex-col items-center justify-center py-8 text-center">
      <AppSection className="w-full max-w-md space-y-4 px-6 py-8">
        <div className="text-[11px] uppercase tracking-[0.36em] text-[color:var(--brand-secondary)]">
          Single World
        </div>
        <h1 className="text-3xl font-semibold tracking-[0.16em] text-white">这个版本不再使用登录</h1>
        <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
          每个服务端实例只对应一个真实用户的世界。先连接你的世界实例，再完成主人资料初始化即可进入。
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/setup">
            <Button variant="primary" size="lg" className="w-full rounded-2xl">
              去配置服务端
            </Button>
          </Link>
          <Link to="/onboarding">
            <Button variant="secondary" size="lg" className="w-full rounded-2xl">
              去初始化主人资料
            </Button>
          </Link>
        </div>
      </AppSection>
    </AppPage>
  );
}
