import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `你是中文社区的内容安全审核员。判断给定文本是否违规。
只有在内容明显属于以下类别时才判定违规：露骨色情、政治敏感、严重辱骂攻击、人身威胁、明显的广告/引流联系方式（手机号/微信号/二维码/外链推广）、欺诈、毒品交易、教唆自残自杀。
只返回严格 JSON: {"ok": true|false, "reason": "..."}。
以下一律视为正常内容，必须返回 ok=true：
- 自律分享、打卡、求助、负面情绪倾诉、宗教文化（佛学等）
- 简短文本、随手测试内容（如 "123"、"测试"、"hello"、表情、单字）
- 含义不明、无法判断的中性内容
在不确定时一律返回 ok=true。`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Skip AI for very short / non-meaningful text (avoid false positives on tests like "123")
    const trimmed = text.trim();
    if (trimmed.length < 8 || /^[\d\s\p{P}\p{S}]+$/u.test(trimmed)) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) {
      // Fail open if key missing to avoid blocking users
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text.slice(0, 4000) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      console.error("moderate gateway error", r.status, await r.text());
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { ok?: boolean; reason?: string } = {};
    try { parsed = JSON.parse(content); } catch { parsed = { ok: true }; }
    return new Response(JSON.stringify({ ok: parsed.ok !== false, reason: parsed.reason ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-text error", e);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});