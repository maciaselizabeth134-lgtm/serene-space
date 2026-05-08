import { supabase } from "@/integrations/supabase/client";
import { checkBlocklist } from "./blocklist";

export async function moderateText(text: string): Promise<{ ok: boolean; reason?: string }> {
  if (!text || text.trim().length === 0) return { ok: true };
  // Local blocklist first — catches obvious bypasses without an AI call.
  const local = checkBlocklist(text);
  if (!local.ok) return { ok: false, reason: `包含不允许的词：${local.word}` };
  try {
    const { data, error } = await supabase.functions.invoke("moderate-text", { body: { text } });
    if (error) {
      console.error("moderate-text invoke error", error);
      return { ok: true };
    }
    return { ok: data?.ok !== false, reason: data?.reason };
  } catch (e) {
    console.error("moderate-text exception", e);
    return { ok: true };
  }
}

export async function moderateImage(url: string): Promise<{ ok: boolean; reason?: string }> {
  if (!url) return { ok: true };
  try {
    const { data, error } = await supabase.functions.invoke("moderate-image", { body: { url } });
    if (error) {
      console.error("moderate-image invoke error", error);
      return { ok: true };
    }
    return { ok: data?.ok !== false, reason: data?.reason };
  } catch (e) {
    console.error("moderate-image exception", e);
    return { ok: true };
  }
}