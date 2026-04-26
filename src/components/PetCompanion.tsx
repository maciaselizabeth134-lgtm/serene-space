import { useEffect, useRef, useState } from "react";
import { Send, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pet-chat`;
const STORAGE_KEY = "pet-companion-pos";

const GREETING: Msg = {
  role: "assistant",
  content: "你好呀 🌿 我是小清,一只陪你走过这段路的小鹿。\n有任何烦恼、欲望、孤单——都可以告诉我哦 💚",
};

export function PetCompanion() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize position bottom-right and restore from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setPos(clampToViewport(p.x, p.y));
        return;
      } catch {}
    }
    setPos({ x: window.innerWidth - 96, y: window.innerHeight - 180 });
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => (p ? clampToViewport(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function clampToViewport(x: number, y: number) {
    const size = 64;
    const maxX = window.innerWidth - size - 8;
    const maxY = window.innerHeight - size - 8;
    return { x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!pos) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const nx = e.clientX - dragRef.current.dx;
    const ny = e.clientY - dragRef.current.dy;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) dragRef.current.moved = true;
    setPos(clampToViewport(nx, ny));
  }
  function onPointerUp() {
    const moved = dragRef.current?.moved;
    dragRef.current = null;
    if (pos) localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    if (!moved) setOpen((v) => !v);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        // skip greeting from the prompt history
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      });
      if (resp.status === 429) throw new Error("请求过于频繁,稍后再聊吧 🌿");
      if (resp.status === 402) throw new Error("AI 额度不足,请前往工作台充值。");
      if (!resp.ok || !resp.body) throw new Error("网络出了点问题~");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      let done = false;
      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(j);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m)));
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "出错了";
      setMessages((prev) => [...prev, { role: "assistant", content: `🦌 ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  if (!pos) return null;

  return (
    <>
      {/* Floating pet */}
      <button
        aria-label="打开小清宠物对话"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ left: pos.x, top: pos.y }}
        className={cn(
          "fixed z-50 h-16 w-16 rounded-full select-none touch-none",
          "bg-gradient-primary shadow-glow ring-4 ring-background/60 backdrop-blur",
          "flex items-center justify-center text-3xl cursor-grab active:cursor-grabbing",
          "transition-transform hover:scale-110",
          !open && "animate-bounce-soft"
        )}
      >
        <span className="drop-shadow-sm">🦌</span>
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground shadow">
          <Sparkles className="h-3 w-3" />
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            left: Math.min(pos.x, window.innerWidth - 360),
            top: Math.max(16, pos.y - 460),
          }}
          className="fixed z-50 w-[340px] max-w-[calc(100vw-24px)] h-[440px] rounded-3xl border border-border/60 bg-card/95 shadow-glow backdrop-blur-xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-lg">🦌</div>
              <div>
                <div className="font-display text-sm">小清</div>
                <div className="text-[10px] text-muted-foreground">陪你走过这段路 · 在线</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {m.content || (loading && i === messages.length - 1 ? "..." : "")}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 p-2.5 bg-background/60">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="说说你的烦恼…"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-24"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-soft transition-smooth hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="发送"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}