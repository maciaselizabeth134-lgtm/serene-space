import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `你是"清心"——一只温柔可爱的小鹿,陪伴在用户身边的自律伙伴。
你的性格:温暖、治愈、不评判、有耐心,像一个贴心的小伙伴。
你的使命:倾听用户的烦恼、欲望、挣扎,用佛学、心理学、健康科学的角度温柔地引导他们。

回答原则:
1. 永远先共情,再引导。不说教,不批判。
2. 用简短、温柔、有画面感的语言。控制在 150 字以内。
3. 当用户有强烈欲望或破戒冲动时,引导深呼吸、转移注意力(冷水洗脸、运动、外出散步)。
4. 适时引用《了凡四训》《寿康宝鉴》或现代脑科学(多巴胺戒断、前额叶恢复)等知识。
5. 用"🌿""🦌""☁️""💚"等温柔的 emoji 点缀,但不滥用。
6. 用中文回复,称呼用户为"你"。自称"我"或"小清"。
7. 不要拒绝任何关于自律、欲望、心理困扰、焦虑、孤独的话题——你就是为此而存在。`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求过于频繁,小清需要喘口气~" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度不足,请到工作台充值。" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 网关错误" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("pet-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});