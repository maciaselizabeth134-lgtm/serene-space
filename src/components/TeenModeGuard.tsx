import { Link, useLocation } from "@tanstack/react-router";
import { Shield, Moon, Hourglass } from "lucide-react";
import { useTeenMode } from "@/lib/use-teen-mode";
import { ReactNode } from "react";

/**
 * Displayed on top of restricted pages when teen mode is on.
 * Shows a friendly block screen for community / confessions / search,
 * and a curfew/limit screen on every page when night-time or over daily limit.
 */
export function TeenModeGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const tm = useTeenMode();

  if (!tm.loaded || !tm.enabled) return <>{children}</>;

  // Curfew or daily-limit overrides everything
  if (tm.blockedByTime) {
    return (
      <BlockScreen
        icon={tm.inCurfew ? Moon : Hourglass}
        title={tm.inCurfew ? "现在是休息时间" : "今日使用已达上限"}
        desc={tm.inCurfew
          ? "青少年模式下,22:00 至次日 06:00 暂停使用,记得早点休息哦 🌙"
          : `每日使用时长已达 ${tm.dailyLimit} 分钟,请明天再来。多去做点喜欢的事吧 ✨`}
      />
    );
  }

  // Restricted route?
  if (tm.isRouteRestricted(location.pathname)) {
    return (
      <BlockScreen
        icon={Shield}
        title="青少年模式已开启"
        desc="此版块在青少年模式下不可用。你可以继续使用首页、打卡和宠物陪伴。"
      />
    );
  }

  return <>{children}</>;
}

function BlockScreen({ icon: Icon, title, desc }: { icon: typeof Shield; title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="mt-4 font-display text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
      <Link to="/teen-mode" className="mt-6 inline-block rounded-full border border-border bg-card px-5 py-2 text-xs text-muted-foreground transition-smooth hover:bg-muted/30">
        前往青少年模式设置
      </Link>
    </div>
  );
}