import { Link, useLocation } from "@tanstack/react-router";
import { Home, Users, CalendarCheck, BookOpen, Leaf, Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "首页", icon: Home },
  { to: "/checkin", label: "打卡", icon: CalendarCheck },
  { to: "/pet", label: "宠物", icon: Sparkles },
  { to: "/community", label: "社区", icon: Users },
  { to: "/learn", label: "学习", icon: BookOpen },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow transition-smooth group-hover:scale-110">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl tracking-wide">清心</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => {
              const active = location.pathname === item.to ||
                (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-smooth",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            to="/profile"
            className="rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-smooth hover:shadow-soft"
          >
            我的
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden sticky bottom-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
          {nav.map((item) => {
            const active = location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] transition-smooth",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "scale-110")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="hidden md:block border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        清心 · 戒色社区 — 愿每一颗心都重获自由与宁静
      </footer>
    </div>
  );
}
