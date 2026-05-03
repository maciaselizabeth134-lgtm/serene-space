import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const REASONS = [
  { v: "spam", l: "垃圾广告" },
  { v: "porn", l: "色情低俗" },
  { v: "politics", l: "政治敏感" },
  { v: "abuse", l: "辱骂攻击" },
  { v: "fake", l: "虚假信息" },
  { v: "other", l: "其他" },
];

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetUserId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetType: "post" | "comment" | "confession";
  targetId: string;
  targetUserId?: string;
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState("spam");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return toast.error("请先登录");
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      target_user_id: targetUserId ?? null,
      reason,
      detail: detail.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("举报已提交，感谢你帮助维护社区");
    setDetail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>举报内容</DialogTitle>
          <DialogDescription>请选择举报原因，我们会尽快处理。</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r.v}
              type="button"
              onClick={() => setReason(r.v)}
              className={`rounded-full border px-3 py-1 text-xs transition-smooth ${
                reason === r.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {r.l}
            </button>
          ))}
        </div>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="补充说明（选填）"
          className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground"
          >
            取消
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="rounded-full bg-gradient-primary px-5 py-1.5 text-sm text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {submitting ? "提交中…" : "提交举报"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}