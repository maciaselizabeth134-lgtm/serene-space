import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Sparkles, Pencil, RefreshCw, Apple, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PET_CATALOG,
  PetCreature,
  STAGE_LABELS,
  stageFromDays,
  currentStageThreshold,
  nextStageThreshold,
  type PetSpecies,
  type PetStage,
} from "@/components/PetCreature";

export const Route = createFileRoute("/pet")({
  head: () => ({
    meta: [
      { title: "我的宠物 — 清心" },
      { name: "description", content: "挑选你的专属电子宠物,喂养陪伴,与你一起成长。" },
    ],
  }),
  component: PetPage,
});

type Msg = { role: "user" | "assistant"; content: string };
type PetState = {
  food: number;
  satiety: number;
  last_satiety_date: string;
  last_fed_at: string | null;
  last_break_at: string | null;
  total_fed: number;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pet-chat`;
const SATIETY_MAX = 10;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysSince(start: string | null) {
  if (!start) return 1;
  const d0 = new Date(start + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - d0.getTime()) / 86400000)) + 1;
}

function dateDiffDays(a: string, b: string) {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

function moodFromState(satiety: number, brokeRecently: boolean): {
  label: string;
  tone: "great" | "ok" | "low" | "sad" | "broken";
} {
  if (brokeRecently) return { label: "被你温柔地需要着", tone: "broken" };
  if (satiety >= 8) return { label: "心满意足", tone: "great" };
  if (satiety >= 5) return { label: "状态平稳", tone: "ok" };
  if (satiety >= 2) return { label: "有点想念你", tone: "low" };
  return { label: "饿坏啦…", tone: "sad" };
}

function PetPage() {
  const { user, loading: authLoading } = useAuth();
  const [pet, setPet] = useState<{ pet_type: PetSpecies; nickname: string } | null>(null);
  const [petState, setPetState] = useState<PetState | null>(null);
  const [days, setDays] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [feeding, setFeeding] = useState(false);

  // Reconcile satiety against missed days.
  // 1 missed day = -1 satiety. Then update last_satiety_date to today.
  const reconcileSatiety = async (uid: string, current: PetState): Promise<PetState> => {
    const today = todayStr();
    const missed = Math.max(0, dateDiffDays(current.last_satiety_date, today));
    if (missed === 0) return current;
    const newSatiety = Math.max(0, current.satiety - missed);
    const { data, error } = await supabase
      .from("pet_state")
      .update({ satiety: newSatiety, last_satiety_date: today })
      .eq("user_id", uid)
      .select("food, satiety, last_satiety_date, last_fed_at, last_break_at, total_fed")
      .single();
    if (error || !data) return { ...current, satiety: newSatiety, last_satiety_date: today };
    return data as PetState;
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Make sure pet_state row exists (RLS allows authenticated user to insert their own)
    await supabase.from("pet_state").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

    const [{ data: petRow }, { data: prof }, { data: ps }] = await Promise.all([
      supabase.from("user_pets").select("pet_type, nickname").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("quit_start_date").eq("id", user.id).single(),
      supabase.from("pet_state").select("food, satiety, last_satiety_date, last_fed_at, last_break_at, total_fed").eq("user_id", user.id).single(),
    ]);

    const validIds = PET_CATALOG.map((p) => p.id) as string[];
    if (petRow) {
      const pt = validIds.includes(petRow.pet_type)
        ? (petRow.pet_type as PetSpecies)
        : null;
      // Old/legacy pet types are no longer supported — force re-pick.
      setPet(pt ? { pet_type: pt, nickname: petRow.nickname } : null);
    } else {
      setPet(null);
    }
    setDays(daysSince(prof?.quit_start_date ?? null));

    if (ps) {
      const reconciled = await reconcileSatiety(user.id, ps as PetState);
      setPetState(reconciled);
    }
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

  const feed = async () => {
    if (!user || !petState || feeding) return;
    if (petState.food <= 0) return toast.error("食物不够啦~ 去打卡或在社区发帖获得食物吧");
    if (petState.satiety >= SATIETY_MAX) return toast.info("ta 已经吃饱啦,过会儿再喂吧 🌿");
    setFeeding(true);
    const newFood = petState.food - 1;
    const newSatiety = Math.min(SATIETY_MAX, petState.satiety + 1);
    const { data, error } = await supabase
      .from("pet_state")
      .update({
        food: newFood,
        satiety: newSatiety,
        last_fed_at: new Date().toISOString(),
        total_fed: petState.total_fed + 1,
      })
      .eq("user_id", user.id)
      .select("food, satiety, last_satiety_date, last_fed_at, last_break_at, total_fed")
      .single();
    setFeeding(false);
    if (error || !data) return toast.error(error?.message ?? "喂食失败");
    setPetState(data as PetState);
    toast.success("吃得好开心~ 🍎");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-3xl">我的宠物</h1>
          <p className="mt-2 text-sm text-muted-foreground">打卡、发帖、评论可获得食物,记得每天来喂 ta 哦。</p>
        </div>

        {loading ? (
          <div className="mt-12 text-center text-sm text-muted-foreground">加载中…</div>
        ) : !pet ? (
          <PetPicker onPick={choose} />
        ) : (
          <PetHome
            pet={pet}
            days={days}
            state={petState}
            feeding={feeding}
            onFeed={feed}
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
            className="group rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-glow text-left"
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
  pet, days, state, feeding, onFeed,
  editingName, nameDraft,
  onStartEdit, onChangeDraft, onSaveName, onReset,
}: {
  pet: { pet_type: PetSpecies; nickname: string };
  days: number;
  state: PetState | null;
  feeding: boolean;
  onFeed: () => void;
  editingName: boolean;
  nameDraft: string;
  onStartEdit: () => void;
  onChangeDraft: (v: string) => void;
  onSaveName: () => void;
  onReset: () => void;
}) {
  const stage = stageFromDays(days);
  const cur = currentStageThreshold(stage);
  const next = nextStageThreshold(stage);
  const progress = stage >= 6 ? 1 : Math.min(1, (days - cur) / Math.max(1, next - cur));
  const meta = PET_CATALOG.find((p) => p.id === pet.pet_type)!;

  const satiety = state?.satiety ?? 0;
  const food = state?.food ?? 0;
  const brokeRecently = !!state?.last_break_at &&
    Date.now() - new Date(state.last_break_at).getTime() < 24 * 3600 * 1000;
  const mood = moodFromState(satiety, brokeRecently);

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.1fr]">
      {/* Stage panel */}
      <div className="rounded-3xl border border-border/60 bg-gradient-soft p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{meta.element}</span>
          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-[11px] text-primary">{STAGE_LABELS[stage]}</span>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <PetCreature
            species={pet.pet_type}
            stage={stage}
            size={240}
            state={feeding ? "happy" : "idle"}
          />
          <span className={cn(
            "mt-1 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[11px]",
            mood.tone === "great" && "bg-primary/15 text-primary",
            mood.tone === "ok" && "bg-muted text-muted-foreground",
            mood.tone === "low" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
            mood.tone === "sad" && "bg-destructive/10 text-destructive",
            mood.tone === "broken" && "bg-pink-500/10 text-pink-600 dark:text-pink-400",
          )}>
            <Heart className="h-3 w-3" /> {mood.label}
          </span>
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

        {/* Satiety bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> 饱腹度</span>
            <span>{satiety} / {SATIETY_MAX}</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                satiety >= 5 ? "bg-gradient-primary" : satiety >= 2 ? "bg-amber-400" : "bg-destructive/70"
              )}
              style={{ width: `${(satiety / SATIETY_MAX) * 100}%` }}
            />
          </div>
        </div>

        {/* Food + feed button */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-2xl border border-border/60 bg-card/70 px-3 py-2 flex items-center gap-2">
            <Apple className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{food}</span>
            <span className="text-[11px] text-muted-foreground">个食物</span>
          </div>
          <button
            onClick={onFeed}
            disabled={feeding || food <= 0 || satiety >= SATIETY_MAX}
            className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {satiety >= SATIETY_MAX ? "已吃饱" : feeding ? "喂食中…" : "喂食 +1"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
          每日打卡、社区发帖、评论各可获得 1 个食物。漏签 1 天饱腹度 -1,破戒重置 -3。
        </p>

        {/* Stage progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>已陪伴 {days} 天</span>
            <span>{stage >= 6 ? "已超越 ✦" : `下一阶段 ${next} 天`}</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {[0,1,2,3,4,5,6].map((i) => (
              <div key={i} className={cn(
                "rounded-md border px-1 py-1 text-center text-[9px] leading-tight",
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
      <PetChat
        petName={pet.nickname}
        species={pet.pet_type}
        stage={stage}
        mood={mood}
        brokeRecently={brokeRecently}
        satiety={satiety}
      />
    </div>
  );
}

function PetChat({
  petName, species, stage, mood, brokeRecently, satiety,
}: {
  petName: string;
  species: PetSpecies;
  stage: PetStage;
  mood: { label: string; tone: string };
  brokeRecently: boolean;
  satiety: number;
}) {
  // Build a context-aware first message
  const greeting = (() => {
    if (brokeRecently) {
      return `亲爱的,我看到你了。\n摔倒了没关系,我也只是少吃了一点点东西而已。\n来,先抱抱我,然后我们一起重新出发,好不好?💚`;
    }
    if (satiety <= 2) {
      return `呜… 我有点饿了。\n但更想念你 🌿 你愿意陪我说说话,然后喂喂我吗?`;
    }
    if (satiety >= 8) {
      return `今天的我超级幸福~ 🌟\n你在认真生活,我都看到了。`;
    }
    return `你好呀 🌿 我是 ${petName}。\n这一路有我陪着,你想说什么都可以哦 💚`;
  })();

  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [petState, setPetState] = useState<"idle" | "happy" | "talking">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refresh greeting if mood changes (e.g. just-broke)
  useEffect(() => {
    setMessages((prev) => prev.length <= 1
      ? [{ role: "assistant", content: greeting }]
      : prev
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokeRecently, satiety]);

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
            {STAGE_LABELS[stage]} · {mood.label}
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
