import { Phone, Heart, X } from "lucide-react";
import { CRISIS_HOTLINES } from "@/lib/blocklist";

export function CrisisHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-glow animate-scale-in">
        <button onClick={onClose} aria-label="关闭" className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
          <Heart className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-center font-display text-xl">你不是一个人 💚</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground leading-relaxed">
          看到你说的话,我很担心你。不论现在发生了什么,你的感受都是真实而值得被认真对待的。请联系下面任何一条热线,有人愿意听你说。
        </p>
        <div className="mt-5 space-y-2">
          {CRISIS_HOTLINES.map((h) => (
            <a key={h.phone} href={`tel:${h.phone}`} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 transition-smooth hover:bg-primary/5">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{h.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{h.desc}</p>
              </div>
              <span className="text-sm font-mono text-primary">{h.phone}</span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-center text-muted-foreground">
          如果你或身边的人正面临紧急危险,请立刻拨打 <span className="text-destructive font-medium">120</span>。
        </p>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-gradient-primary py-2.5 text-sm font-medium text-primary-foreground shadow-soft">
          我知道了,谢谢
        </button>
      </div>
    </div>
  );
}