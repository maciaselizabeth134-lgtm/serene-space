import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Pin, X } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
};

const DISMISS_KEY = "dismissed_announcements";

export function AnnouncementBoard() {
  const [list, setList] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]");
        setDismissed(new Set(saved));
      } catch {}
    }
    supabase
      .from("announcements")
      .select("id, title, content, pinned, created_at")
      .eq("published", true)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setList((data ?? []) as Announcement[]));
  }, []);

  const dismiss = (id: string) => {
    const s = new Set(dismissed); s.add(id);
    setDismissed(s);
    if (typeof window !== "undefined") localStorage.setItem(DISMISS_KEY, JSON.stringify([...s]));
  };

  const visible = list.filter((a) => a.pinned || !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-4 -mt-4">
      <div className="space-y-2">
        {visible.map((a) => {
          const open = expanded === a.id;
          return (
            <div key={a.id} className="rounded-2xl border border-primary/20 bg-primary/5 p-3 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {a.pinned ? <Pin className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <button onClick={() => setExpanded(open ? null : a.id)} className="text-left w-full">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className={`mt-1 whitespace-pre-wrap text-xs text-muted-foreground ${open ? "" : "line-clamp-1"}`}>{a.content}</p>
                  </button>
                </div>
                {!a.pinned && (
                  <button onClick={() => dismiss(a.id)} aria-label="忽略" className="shrink-0 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}