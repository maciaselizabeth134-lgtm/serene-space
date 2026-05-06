import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, User as UserIcon } from "lucide-react";
import { PetCreature, type PetSpecies, type PetStage } from "@/components/PetCreature";
import { moderateImage } from "@/lib/moderation";

interface Props {
  userId: string;
  avatarUrl: string | null;
  username?: string | null;
  petSpecies?: PetSpecies | null;
  petStage?: PetStage;
  size?: number;
  /** when true, shows a camera button & enables click-to-upload */
  editable?: boolean;
  onUpdated?: (newUrl: string) => void;
  /** position of the pet badge */
  petPosition?: "top-right" | "bottom-right";
}

/**
 * Round avatar with the user's evolving pet floating at one corner.
 * If editable, clicking opens a file picker to upload a new avatar
 * to the public `avatars` bucket.
 */
export function AvatarWithPet({
  userId,
  avatarUrl,
  username,
  petSpecies,
  petStage = 0,
  size = 96,
  editable = false,
  onUpdated,
  petPosition = "top-right",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(avatarUrl);

  useEffect(() => setLocalUrl(avatarUrl), [avatarUrl]);

  const petSize = Math.round(size * 0.5);
  const petOffset = Math.round(size * 0.04);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片不能超过 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setUploading(false);
      toast.error("上传失败:" + upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    // 图片安全审核
    const mod = await moderateImage(publicUrl);
    if (!mod.ok) {
      await supabase.storage.from("avatars").remove([path]);
      setUploading(false);
      toast.error("图片不符合社区规范" + (mod.reason ? `：${mod.reason}` : ""));
      return;
    }
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);
    setUploading(false);
    if (updErr) {
      toast.error("保存失败:" + updErr.message);
      return;
    }
    setLocalUrl(publicUrl);
    toast.success("头像已更新");
    onUpdated?.(publicUrl);
  };

  const onClick = () => {
    if (!editable || uploading) return;
    inputRef.current?.click();
  };

  const corner =
    petPosition === "top-right"
      ? { top: -petOffset, right: -petOffset }
      : { bottom: -petOffset, right: -petOffset };

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={onClick}
        disabled={!editable || uploading}
        aria-label={editable ? "更换头像" : username ?? "用户头像"}
        className={`group relative block overflow-hidden rounded-full border border-border/60 bg-gradient-to-br from-primary/10 to-primary/5 shadow-soft ${
          editable ? "cursor-pointer transition-smooth hover:shadow-glow" : "cursor-default"
        }`}
        style={{ width: size, height: size }}
      >
        {localUrl ? (
          <img
            src={localUrl}
            alt={username ?? "头像"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <UserIcon style={{ width: size * 0.45, height: size * 0.45 }} />
          </div>
        )}
        {editable && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-smooth group-hover:bg-black/35 group-hover:opacity-100">
            <Camera className="h-5 w-5" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs text-muted-foreground">
            上传中…
          </div>
        )}
      </button>

      {petSpecies && (
        <div
          className="pointer-events-none absolute drop-shadow-md"
          style={{ ...corner, width: petSize, height: petSize }}
        >
          <PetCreature
            species={petSpecies}
            stage={petStage}
            size={petSize}
            state="idle"
          />
        </div>
      )}

      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={onClick}
            disabled={uploading}
            aria-label="更换头像"
            className="absolute bottom-0 left-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft transition-smooth hover:bg-primary hover:text-primary-foreground"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}