import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `你是中文社区的内容安全审核员。判断给定文本是否违规。
违规类别包括：色情、政治敏感、辱骂攻击、人身威胁、垃圾广告、引流联系方式、欺诈、毒品、自残教唆。
只返回严格 JSON: {"ok": true|false, "reason": "..."}。
正常的自律分享、求助、负面情绪倾诉、宗教文化（佛学等）属于正常内容。`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
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