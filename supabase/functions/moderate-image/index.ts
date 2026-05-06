import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `你是中文社区的图片内容安全审核员。请判断图片是否违规。
违规类别：色情/裸露、政治敏感（含国家领导人、敏感旗帜符号）、血腥暴力、毒品、赌博、违禁品广告、二维码引流、明显的人身攻击/侮辱性图。
正常生活、自律打卡、宠物、风景、美食、运动、卡通插画属于正常内容。
只返回严格 JSON: {"ok": true|false, "reason": "..."}。`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "请审核这张图片是否违规。" },
              { type: "image_url", image_url: { url } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      console.error("moderate-image gateway error", r.status, await r.text());
      // fail open to avoid blocking on transient failures
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
    console.error("moderate-image error", e);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});