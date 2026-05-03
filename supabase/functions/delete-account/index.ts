import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u, error: uerr } = await userClient.auth.getUser();
    if (uerr || !u?.user) {
      return new Response(JSON.stringify({ error: "未登录" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uid = u.user.id;
    const admin = createClient(url, service);

    // delete app data
    const tables = ["likes", "comments", "posts", "checkins", "confessions", "feedback", "reports", "user_blocks", "notifications", "pet_state", "pet_rewards", "user_pets", "profiles"];
    for (const t of tables) {
      const col = t === "user_blocks" ? "blocker_id" : (t === "profiles" ? "id" : "user_id");
      const { error } = await admin.from(t).delete().eq(col, uid);
      if (error) console.error("delete", t, error.message);
    }
    // remove blocks against this user too
    await admin.from("user_blocks").delete().eq("blocked_id", uid);
    // remove notifications mentioning this actor
    await admin.from("notifications").delete().eq("actor_id", uid);

    // delete avatar storage folder
    const { data: files } = await admin.storage.from("avatars").list(uid);
    if (files && files.length) {
      await admin.storage.from("avatars").remove(files.map((f) => `${uid}/${f.name}`));
    }

    // finally delete auth user
    const { error: aerr } = await admin.auth.admin.deleteUser(uid);
    if (aerr) {
      console.error("auth delete error", aerr.message);
      return new Response(JSON.stringify({ error: aerr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("delete-account error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "未知错误" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});