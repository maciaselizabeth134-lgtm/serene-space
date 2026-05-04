import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Share2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  username: string;
  days: number;
  achievementName?: string;
  achievementEmoji?: string;
};

export function SharePoster({ open, onOpenChange, username, days, achievementName, achievementEmoji }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const W = 720, H = 1080;
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // gradient bg
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0f1f1c");
    g.addColorStop(0.5, "#1a3d35");
    g.addColorStop(1, "#0a1614");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // soft glow circle
    const r = ctx.createRadialGradient(W/2, 320, 20, W/2, 320, 360);
    r.addColorStop(0, "rgba(180,255,220,0.45)");
    r.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, 700);

    ctx.fillStyle = "#cdebde";
    ctx.font = "300 36px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("清心 · 自律见证", W/2, 110);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 220px system-ui, -apple-system, sans-serif";
    ctx.fillText(String(days), W/2, 480);

    ctx.fillStyle = "#9ed5b9";
    ctx.font = "400 38px system-ui, -apple-system, sans-serif";
    ctx.fillText("连续坚持 · 天", W/2, 540);

    // achievement box
    if (achievementName) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      const bx = 120, by = 640, bw = 480, bh = 160;
      const rad = 30;
      ctx.beginPath();
      ctx.moveTo(bx+rad, by);
      ctx.arcTo(bx+bw, by, bx+bw, by+bh, rad);
      ctx.arcTo(bx+bw, by+bh, bx, by+bh, rad);
      ctx.arcTo(bx, by+bh, bx, by, rad);
      ctx.arcTo(bx, by, bx+bw, by, rad);
      ctx.fill();

      ctx.font = "60px system-ui";
      ctx.fillStyle = "#fff";
      ctx.fillText(achievementEmoji ?? "🏆", W/2 - 140, by+105);
      ctx.font = "600 42px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(achievementName, W/2 - 80, by+85);
      ctx.font = "300 24px system-ui";
      ctx.fillStyle = "#9ed5b9";
      ctx.fillText("解锁新成就", W/2 - 80, by+125);
      ctx.textAlign = "center";
    }

    ctx.fillStyle = "#cdebde";
    ctx.font = "400 32px system-ui";
    ctx.fillText(`@${username}`, W/2, 900);

    ctx.fillStyle = "rgba(205,235,222,0.6)";
    ctx.font = "300 24px system-ui";
    ctx.fillText("愿每一颗心都重获自由与宁静", W/2, 970);
    ctx.font = "300 20px system-ui";
    ctx.fillText("清心 App · 自律社区", W/2, 1010);

    setDataUrl(c.toDataURL("image/png"));
  }, [open, username, days, achievementName, achievementEmoji]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qingxin-${days}d.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分享我的坚持</DialogTitle>
          <DialogDescription>长按图片可保存到相册</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-xl">
          <canvas ref={canvasRef} className="hidden" />
          {dataUrl ? (
            <img src={dataUrl} alt="分享海报" className="w-full" />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">生成中…</p>
          )}
        </div>
        <button
          onClick={download}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-soft"
        >
          <Download className="h-4 w-4" /> 保存图片
        </button>
        <p className="text-center text-[11px] text-muted-foreground inline-flex items-center justify-center gap-1">
          <Share2 className="h-3 w-3" /> 保存后可分享到任意社交平台
        </p>
      </DialogContent>
    </Dialog>
  );
}
