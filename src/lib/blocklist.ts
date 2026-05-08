// Local fallback content blocklist + crisis-keyword detector.
// AI moderation handles nuance; this catches obvious bypasses and
// triggers the crisis-help dialog when self-harm wording appears.

const BANNED = [
  // 政治敏感（示意，需结合官方词库扩充）
  "习近平", "六四", "法轮", "反共",
  // 色情
  "黄片", "约炮", "嫖娼", "卖淫", "三级片",
  // 违法
  "毒品", "冰毒", "贩毒", "枪支", "炸药",
  // 辱骂（最常见）
  "操你妈", "傻逼", "草泥马", "fuck you",
];

const CRISIS = [
  "自杀", "想死", "不想活", "活不下去", "结束生命",
  "跳楼", "割腕", "上吊", "自残", "自我伤害",
  "离开这个世界", "解脱了",
];

function normalize(t: string) {
  return t.toLowerCase().replace(/\s+/g, "");
}

export function checkBlocklist(text: string): { ok: boolean; word?: string } {
  if (!text) return { ok: true };
  const n = normalize(text);
  for (const w of BANNED) {
    if (n.includes(normalize(w))) return { ok: false, word: w };
  }
  return { ok: true };
}

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  const n = normalize(text);
  return CRISIS.some((w) => n.includes(normalize(w)));
}

export const CRISIS_HOTLINES: { name: string; phone: string; desc: string }[] = [
  { name: "北京心理危机研究与干预中心", phone: "010-82951332", desc: "24 小时全国免费心理援助" },
  { name: "希望 24 热线", phone: "400-161-9995", desc: "24 小时生命教育与危机干预" },
  { name: "全国心理援助热线", phone: "400-161-9995", desc: "公益免费,可拨打求助" },
  { name: "急救", phone: "120", desc: "如果你或他人正处于紧急危险中,请立刻拨打" },
];