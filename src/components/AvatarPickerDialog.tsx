import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Check } from "lucide-react";

/**
 * Preset avatars rendered inline as SVG data URLs — no external assets, no
 * storage required. Each preset is a soft gradient circle with an emoji glyph
 * so users can pick a unified, on-brand identity in one tap.
 */
const PRESETS: { id: string; label: string; from: string; to: string; glyph: string }[] = [
  { id: "lotus",   label: "莲心", from: "#ffd6e7", to: "#b48bff", glyph: "🪷" },
  { id: "leaf",    label: "新叶", from: "#d6f5d6", to: "#4fb38a", glyph: "🌿" },
  { id: "moon",    label: "月静", from: "#dce6ff", to: "#6f7fd6", glyph: "🌙" },
  { id: "sun",     label: "朝阳", from: "#fff1c2", to: "#ffaf6a", glyph: "☀️" },
  { id: "wave",    label: "潮汐", from: "#cdeaff", to: "#3a8fd0", glyph: "🌊" },
  { id: "star",    label: "星河", from: "#e8dcff", to: "#5b3fb8", glyph: "✨" },
  { id: "bamboo",  label: "竹影", from: "#e7f6d4", to: "#6b9b3a", glyph: "🎋" },
  { id: "flame",   label: "心火", from: "#ffe0d6", to: "#e0613a", glyph: "🔥" },
];

function presetDataUrl(p: (typeof PRESETS)[number]) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${p.from}'/><stop offset='100%' stop-color='${p.to}'/>
    </linearGradient></defs>
    <circle cx='60' cy='60' r='60' fill='url(#g)'/>
    <text x='60' y='78' font-size='62' text-anchor='middle' font-family='Apple Color Emoji,Segoe UI Emoji,system-ui,sans-serif'>${p.glyph}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPicked?: (url: string) => void;
}

export function AvatarPickerDialog({ open, onOpenChange, onPicked }: Props) {
  const { user } = useAuth();
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("profiles").select("avatar_url").eq("id", user.id).single()
      .then(({ data }) => setCurrent(data?.avatar_url ?? null));
  }, [open, user]);

  const apply = async (url: string) => {
    if (!user) return toast.error("请先登录");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setCurrent(url);
    onPicked?.(url);
    toast.success("头像已更新");
    onOpenChange(false);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("请选择图片文件");
    if (file.size > 5 * 1024 * 1024) return toast.error("图片不能超过 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await apply(pub.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">选择你的头像</DialogTitle>
          <DialogDescription>选一个属于你的标识,开启清心之旅。也可以上传自己的图片。</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 py-2">
          {PRESETS.map((p) => {
            const url = presetDataUrl(p);
            const active = current === url;
            return (
              <button
                key={p.id}
                type="button"
                disabled={saving}
                onClick={() => apply(url)}
                className={`group relative flex flex-col items-center gap-1 rounded-2xl p-2 transition-smooth hover:bg-muted ${
                  active ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
              >
                <img src={url} alt={p.label} className="h-14 w-14 rounded-full shadow-soft" />
                <span className="text-[11px] text-muted-foreground">{p.label}</span>
                {active && (
                  <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm transition-smooth hover:bg-muted disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "上传中…" : "上传自定义图片"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
      </DialogContent>
    </Dialog>
  );
}