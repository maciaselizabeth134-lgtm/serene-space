import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "privacy_accepted_v1";

export function PrivacyGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(KEY)) setOpen(true);
  }, []);

  if (!open) return null;

  const accept = () => {
    window.localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-glow">
        <h2 className="font-display text-xl">欢迎使用清心</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          我们重视你的隐私。使用前请阅读并同意我们的{" "}
          <Link to="/terms" className="text-primary underline-offset-2 hover:underline">《用户协议》</Link>
          {" "}和{" "}
          <Link to="/privacy" className="text-primary underline-offset-2 hover:underline">《隐私政策》</Link>
          。我们仅收集必要信息用于提供服务，不会出售你的个人数据。
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => { window.location.href = "about:blank"; }}
            className="flex-1 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
          >
            不同意
          </button>
          <button
            onClick={accept}
            className="flex-[2] rounded-full bg-gradient-primary px-4 py-2 text-sm text-primary-foreground shadow-soft"
          >
            同意并继续
          </button>
        </div>
      </div>
    </div>
  );
}