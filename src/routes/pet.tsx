import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Sparkles, Pencil, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PET_CATALOG,
  PetCreature,
  STAGE_LABELS,
  stageFromDays,
  type PetSpecies,
} from "@/components/PetCreature";

export const Route = createFileRoute("/pet")({
  head: () => ({
    meta: [
      { title: "我的宠物 — 清心" },
      { name: "description", content: "挑选你的专属电子宠物,陪你戒色路上一同成长。" },
    ],
  }),
  component: PetPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pet-chat`;

function daysSince(start: string | null) {
  if (!start) return 1;
  const d0 = new Date(start + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - d0.getTime()) / 86400000)) + 1;
}

function PetPage() {
  const { user, loading: authLoading } = useAuth();
  const [pet, setPet] = useState<{ pet_type: PetSpecies; nickname: string } | null>(null);
  const [days, setDays] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: petRow }, { data: prof }] = await Promise.all([
      supabase.from("user_pets").select("pet_type, nickname").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("quit_start_date").eq("id", user.id).single(),
    ]);
    setPet(petRow ? { pet_type: petRow.pet_type as PetSpecies, nickname: petRow.nickname } : null);
    setDays(daysSince(prof?.quit_start_date ?? null));
    setLoading(false);
  };

  useEffect(() => { if (!authLoading && user) load(); }, [user, authLoading]);

  if (!authLoading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl">登录后领养你的专属宠物</h1>
          <p className="mt-2 text-sm text-muted-foreground">每一只宠物都会随着你的坚持一同成长。</p>
          <Link to="/auth" className="mt-6 inline-block rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-soft">去登录</Link>
        </div>
      </AppShell>
    );
  }

  const choose = async (id: PetSpecies) => {
    if (!user) return;
    const found = PET_CATALOG.find((p) => p.id === id);
    const nickname = found?.name ?? "小清";
    const { error } = await supabase
      .from("user_pets")
      .upsert({ user_id: user.id, pet_type: id, nickname }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success(`${nickname} 已成为你的伙伴 🌿`);
    load();
  };

  const renameSave = async () => {
    if (!user || !pet) return;
    const v = nameDraft.trim().slice(0, 20);
    if (!v) return setEditingName(false);
    const { error } = await supabase.from("user_pets").update({ nickname: v }).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    setEditingName(false);
    load();
  };

  const reset = async () => {
    if (!user) return;
    if (!confirm("更换宠物会重新选择,确认吗?")) return;
    const { error } = await supabase.from("user_pets").delete().eq("user_id", user.id);
    if (error) return toast.error(error.message);
    setPet(null);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-3xl">我的宠物</h1>
          <p className="mt-2 text-sm text-muted-foreground">领养一只专属伙伴,与你一起穿越漫长的修行之路。</p>
        </div>

        {loading ? (
          <div className="mt-12 text-center text-sm text-muted-foreground">加载中…</div>
        ) : !pet ? (
          <PetPicker onPick={choose} />
        ) : (
          <PetHome
            pet={pet}
            days={days}
            editingName={editingName}
            nameDraft={nameDraft}
            onStartEdit={() => { setNameDraft(pet.nickname); setEditingName(true); }}
            onChangeDraft={setNameDraft}
            onSaveName={renameSave}
            onReset={reset}
          />
        )}
      </div>
    </AppShell>
  );
}

function PetPicker({ onPick }: { onPick: (id: PetSpecies) => void }) {
  const [hover, setHover] = useState<PetSpecies | null>(null);
  return (
    <div className="mt-10">
      <h2 className="font-display text-xl text-center">选择你的专属宠物</h2>
      <p className="mt-1 text-center text-xs text-muted-foreground">领养后宠物会随着你的打卡天数,一起成长进化。</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PET_CATALOG.map((p) => (
          <button
            key={p.id}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPick(p.id)}
            className={cn(
              "group rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-glow text-left"
            )}
          >
            <div className="flex justify-center">
              <PetCreature
                species={p.id}
                stage={hover === p.id ? 2 : 0}
                size={180}
                state={hover === p.id ? "happy" : "idle"}
              />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <h3 className="font-display text-lg">{p.name}</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.element}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
              选择 ta 作为伙伴
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PetHome({
  pet, days,
  editingName, nameDraft,
  onStartEdit, onChangeDraft, onSaveName, onReset,
}: {
  pet: { pet_type: PetSpecies; nickname: string };
  days: number;
  editingName: boolean;
  nameDraft: string;
  onStartEdit: () => void;
  onChangeDraft: (v: string) => void;
  onSaveName: () => void;
  onReset: () => void;
}) {
  const stage = stageFromDays(days);
  // progress within stage
  const thresholds = [0, 7, 30, 100];
  const next = thresholds[Math.min(3, stage + 1)];
  const cur = thresholds[stage];
  const progress = stage >= 3 ? 1 : Math.min(1, (days - cur) / Math.max(1, next - cur));
  const meta = PET_CATALOG.find((p) => p.id === pet.pet_type)!;

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.1fr]">
      {/* Stage panel */}
      <div className="rounded-3xl border border-border/60 bg-gradient-soft p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{meta.element}</span>
          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-[11px] text-primary">{STAGE_LABELS[stage]}</span>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <PetCreature species={pet.pet_type} stage={stage} size={240} state="idle" />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {editingName ? (
            <>
              <input
                value={nameDraft}
                onChange={(e) => onChangeDraft(e.target.value)}
                maxLength={20}
                className="rounded-full border border-border bg-background px-3 py-1 text-sm text-center outline-none focus:border-primary"
              />
              <button onClick={onSaveName} className="text-xs text-primary">保存</button>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl">{pet.nickname}</h2>
              <button onClick={onStartEdit} className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>已陪伴 {days} 天</span>
            <span>{stage >= 3 ? "已圆满 ✦" : `下一阶段 ${next} 天`}</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[0,1,2,3].map((i) => (
              <div key={i} className={cn(
                "rounded-lg border px-1.5 py-1 text-center text-[10px]",
                i <= stage ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"
              )}>{STAGE_LABELS[i]}</div>
            ))}
          </div>
        </div>

        <button
          onClick={onReset}
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card/70 px-4 py-2 text-xs text-muted-foreground transition-smooth hover:text-destructive"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 更换宠物
        </button>
      </div>

      {/* Chat panel */}
      <PetChat petName={pet.nickname} species={pet.pet_type} stage={stage} />
    </div>
  );
}

function PetChat({ petName, species, stage }: { petName: string; species: PetSpecies; stage: 0 | 1 | 2 | 3 }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `你好呀 🌿 我是 ${petName}。\n这一路有我陪着,你想说什么都可以哦 💚` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [petState, setPetState] = useState<"idle" | "happy" | "talking">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    setPetState("talking");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      if (resp.status === 429) throw new Error("聊得太快啦,稍等一下再说吧 🌿");
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
      setPetState("happy");
      setTimeout(() => setPetState("idle"), 1500);
    }
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-soft flex flex-col overflow-hidden h-[540px]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="h-12 w-12 -my-2 flex items-center justify-center">
          <PetCreature species={species} stage={stage} size={56} state={petState} />
        </div>
        <div className="flex-1">
          <div className="font-display text-sm">{petName}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {STAGE_LABELS[stage]} · 在线陪你
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed animate-fade-in",
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}>
              {m.content || (loading && i === messages.length - 1 ? (
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "240ms" }} />
                </span>
              ) : null)}
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
            placeholder={`和 ${petName} 说说话…`}
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
  );
}
