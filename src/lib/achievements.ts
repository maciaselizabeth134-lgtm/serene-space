export type Achievement = {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  threshold: number; // days
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "d1",   name: "破晓之心", desc: "迈出第一步,开启自律之旅",     emoji: "🌱", threshold: 1 },
  { id: "d3",   name: "三日坚持", desc: "连续 3 天,初尝坚持的滋味",   emoji: "🌿", threshold: 3 },
  { id: "d7",   name: "一周新生", desc: "走过 7 天,身体开始记住节奏", emoji: "🌳", threshold: 7 },
  { id: "d15",  name: "半月山岳", desc: "15 天的坚守,如山稳固",       emoji: "⛰️", threshold: 15 },
  { id: "d30",  name: "月相圆满", desc: "30 天达成,心境焕然一新",     emoji: "🌕", threshold: 30 },
  { id: "d60",  name: "破茧成蝶", desc: "60 天蜕变,值得被铭记",       emoji: "🦋", threshold: 60 },
  { id: "d100", name: "百日清心", desc: "百日修行,清明在心",           emoji: "💎", threshold: 100 },
  { id: "d180", name: "半载光华", desc: "半年坚持,熠熠生辉",           emoji: "✨", threshold: 180 },
  { id: "d365", name: "周天圆满", desc: "一整年的自律,你已重获自由",   emoji: "🏆", threshold: 365 },
];
