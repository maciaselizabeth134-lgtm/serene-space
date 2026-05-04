import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { UserPlus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function FollowButton({ userId, className }: { userId: string; className?: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.id === userId) { setFollowing(null); return; }
    supabase.from("follows").select("follower_id")
      .eq("follower_id", user.id).eq("following_id", userId).maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user, userId]);

  if (!user || user.id === userId || following === null) return null;

  const toggle = async () => {
    setBusy(true);
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setFollowing(false);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      if (error) { toast.error(error.message); setBusy(false); return; }
      setFollowing(true);
      toast.success("关注成功");
    }
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-smooth disabled:opacity-50",
        following
          ? "border border-border bg-background text-muted-foreground hover:text-destructive"
          : "bg-gradient-primary text-primary-foreground shadow-soft hover:shadow-glow",
        className,
      )}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "已关注" : "关注"}
    </button>
  );
}
