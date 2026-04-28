export const dailyQuotes = [
  { text: "克己复礼,宁静致远。", source: "《论语》" },
  { text: "天行健,君子以自强不息。", source: "《周易》" },
  { text: "心如止水,清净无尘。", source: "禅语" },
  { text: "千里之行,始于足下。", source: "《道德经》" },
  { text: "胜人者有力,自胜者强。", source: "《道德经》" },
  { text: "静以修身,俭以养德。", source: "诸葛亮" },
  { text: "知止而后有定,定而后能静。", source: "《大学》" },
  { text: "宠辱不惊,看庭前花开花落。", source: "《菜根谭》" },
  { text: "不以物喜,不以己悲。", source: "范仲淹" },
  { text: "海纳百川,有容乃大;壁立千仞,无欲则刚。", source: "林则徐" },
  { text: "苟日新,日日新,又日新。", source: "《大学》" },
  { text: "君子慎独,不欺暗室。", source: "《中庸》" },
  { text: "玉不琢,不成器。", source: "《礼记》" },
  { text: "锲而不舍,金石可镂。", source: "《荀子》" },
  { text: "穷则独善其身,达则兼济天下。", source: "《孟子》" },
];

export function getTodayQuote() {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return dailyQuotes[day % dailyQuotes.length];
}

export const learningResources = [
  {
    title: "为什么要自律",
    summary: "理解自律的本质——这不是压抑,而是对生命能量的珍视与管理。",
    category: "理念",
    readTime: "5 分钟",
  },
  {
    title: "破戒后如何重新开始",
    summary: "失败不可怕,关键是从中学习并重新出发。每一次重启都是新的成长。",
    category: "实践",
    readTime: "7 分钟",
  },
  {
    title: "运动与自律的关系",
    summary: "通过身体锻炼转移注意力,提升精气神,是自律路上的最佳伙伴。",
    category: "方法",
    readTime: "6 分钟",
  },
  {
    title: "正念冥想入门",
    summary: "学会观察自己的念头,不被欲望牵引,做心的主人。",
    category: "心法",
    readTime: "10 分钟",
  },
  {
    title: "建立健康作息",
    summary: "早睡早起,远离深夜的诱惑环境,从生活节奏开始改变。",
    category: "习惯",
    readTime: "5 分钟",
  },
  {
    title: "如何应对欲望波涌",
    summary: "当冲动来袭时的 5 个实用方法:深呼吸、冷水洗脸、运动、阅读、求助。",
    category: "技巧",
    readTime: "8 分钟",
  },
];
