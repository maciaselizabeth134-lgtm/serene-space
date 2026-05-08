import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PetAvatar } from "./PetAvatar";
import { detectCrisis } from "@/lib/blocklist";
import { CrisisHelpDialog } from "./CrisisHelpDialog";

type Msg = { role: "user" | "assistant"; content: string };
type PetState = "idle" | "happy" | "talking" | "sleeping" | "dragging";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pet-chat`;
const STORAGE_KEY = "pet-companion-pos";
const SIZE = 72;
const SLEEP_MS = 30_000;

const GREETING: Msg = {
  role: "assistant",
  content: "你好呀 🌿 我是小清,一只陪你走过这段路的小鹿。\n有任何烦恼、欲望、孤单——都可以告诉我哦 💚",
};

export function PetCompanion() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<PetState>("idle");
  const [bubble, setBubble] = useState<string | null>(null);
  const [facing, setFacing] = useState<1 | -1>(1); // 1 = facing right, -1 = left
  const [crisisOpen, setCrisisOpen] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean; downAt: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Initial position
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const c = clamp(p.x, p.y);
        setPos(c);
        return;
      } catch {}
    }
    setPos({ x: window.innerWidth - 110, y: window.innerHeight - 200 });
  }, []);

  // Resize clamp
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function clamp(x: number, y: number) {
    const maxX = window.innerWidth - SIZE - 8;
    const maxY = window.innerHeight - SIZE - 8;
    return { x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) };
  }

  // ---- Idle wandering: pick a random nearby target periodically ----
  useEffect(() => {
    if (open || state === "dragging") return;
    const id = setInterval(() => {
      if (!pos || dragRef.current) return;
      // chance to wander
      if (Math.random() < 0.55) {
        const dx = (Math.random() - 0.5) * 220;
        const dy = (Math.random() - 0.5) * 160;
        const t = clamp(pos.x + dx, pos.y + dy);
        setTarget(t);
      }
    }, 4500);
    return () => clearInterval(id);
  }, [pos, open, state]);

  // ---- Move toward target each frame (smooth lerp) ----
  useEffect(() => {
    if (!target || !pos) return;
    let raf: number;
    const step = () => {
      setPos((cur) => {
        if (!cur) return cur;
        const dx = target.x - cur.x;
        const dy = target.y - cur.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.6) { setTarget(null); return cur; }
        if (dx > 1) setFacing(1);
        else if (dx < -1) setFacing(-1);
        const speed = Math.min(2, dist * 0.06);
        const nx = cur.x + (dx / dist) * speed;
        const ny = cur.y + (dy / dist) * speed;
        return { x: nx, y: ny };
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, pos]);

  // ---- Sleep after inactivity ----
  useEffect(() => {
    const bumpActivity = () => {
      lastActivityRef.current = Date.now();
      if (state === "sleeping") setState("idle");
    };
    window.addEventListener("pointermove", bumpActivity);
    window.addEventListener("keydown", bumpActivity);
    const id = setInterval(() => {
      if (open) return;
      if (Date.now() - lastActivityRef.current > SLEEP_MS && state !== "sleeping" && state !== "dragging") {
        setState("sleeping");
      }
    }, 2000);
    return () => {
      window.removeEventListener("pointermove", bumpActivity);
      window.removeEventListener("keydown", bumpActivity);
      clearInterval(id);
    };
  }, [state, open]);

  // Show transient bubble messages
  function flashBubble(text: string, ms = 2400) {
    setBubble(text);
    setTimeout(() => setBubble((b) => (b === text ? null : b)), ms);
  }

  // ---- Drag handling ----
  function onPointerDown(e: React.PointerEvent) {
    if (!pos) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false, downAt: Date.now() };
    setTarget(null);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const nx = e.clientX - dragRef.current.dx;
    const ny = e.clientY - dragRef.current.dy;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) {
      dragRef.current.moved = true;
      if (state !== "dragging") setState("dragging");
      if (e.movementX > 0) setFacing(1);
      else if (e.movementX < 0) setFacing(-1);
    }
    setPos(clamp(nx, ny));
  }
  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (pos) localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    if (!drag) return;
    if (drag.moved) {
      setState("happy");
      flashBubble("好刺激~ 🌀");
      setTimeout(() => setState("idle"), 1200);
    } else {
      // tap = open / happy reaction
      setState("happy");
      setTimeout(() => setState(open ? "idle" : "talking"), 600);
      setOpen((v) => !v);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (detectCrisis(text)) setCrisisOpen(true);
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    setState("talking");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
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
      setState("happy");
      setTimeout(() => setState("idle"), 1500);
    }
  }

  if (!pos) return null;

  const centerX = pos.x + SIZE / 2;
  const centerY = pos.y + SIZE / 2;

  return (
    <>
      <CrisisHelpDialog open={crisisOpen} onClose={() => setCrisisOpen(false)} />
      {/* Pet body */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="button"
        aria-label="小清 — 你的电子小鹿"
        style={{
          left: pos.x,
          top: pos.y,
          width: SIZE,
          height: SIZE,
        }}
        className={cn(
          "fixed z-50 select-none touch-none cursor-grab active:cursor-grabbing",
          state === "dragging" && "cursor-grabbing"
        )}
      >
        <div
          style={{ transform: `scaleX(${facing})`, transition: "transform 200ms" }}
        >
          <PetAvatar size={SIZE} state={state} originX={centerX} originY={centerY} />
        </div>

        {/* Speech bubble */}
        {bubble && (
          <div
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-card/95 px-3 py-1.5 text-xs shadow-soft border border-border/60 animate-fade-up"
          >
            {bubble}
            <div className="absolute left-1/2 -translate-x-1/2 top-full h-2 w-2 rotate-45 bg-card border-r border-b border-border/60" />
          </div>
        )}

        {/* Sleeping z's drift */}
        {state === "sleeping" && (
          <div className="pointer-events-none absolute -top-3 right-0 text-xs text-primary/70 animate-float font-display">
            zZ
          </div>
        )}
      </div>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            left: Math.max(12, Math.min(pos.x - 130, window.innerWidth - 360)),
            top: Math.max(16, pos.y - 470),
          }}
          className="fixed z-50 w-[340px] max-w-[calc(100vw-24px)] h-[440px] rounded-3xl border border-border/60 bg-card/95 shadow-glow backdrop-blur-xl flex flex-col overflow-hidden animate-scale-in"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 flex items-center justify-center">
                <PetAvatar size={36} state="happy" originX={centerX} originY={centerY} />
              </div>
              <div>
                <div className="font-display text-sm">小清</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  陪你走过这段路 · 在线
                </div>
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); setState("idle"); }}
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
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed animate-fade-in",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {m.content || (loading && i === messages.length - 1 ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
                      </span>
                      <span className="text-[11px]">小清正在思考…</span>
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm animate-fade-in">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
                    </span>
                    <span className="text-[11px]">小清正在思考…</span>
                  </span>
                </div>
              </div>
            )}
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