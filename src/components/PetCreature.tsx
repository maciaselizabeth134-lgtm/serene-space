import { useEffect, useRef, useState } from "react";

export type PetSpecies = "deer" | "fox" | "rabbit" | "panda" | "phoenix";
export type PetStage = 0 | 1 | 2 | 3; // 幼年 / 成长 / 成熟 / 进化形态

export const PET_CATALOG: { id: PetSpecies; name: string; element: string; desc: string }[] = [
  { id: "deer",    name: "灵鹿小清", element: "森林系", desc: "温柔治愈,陪你走过最静的夜。" },
  { id: "fox",     name: "雪狐若曦", element: "雪原系", desc: "聪慧机敏,为你点亮内在的灵光。" },
  { id: "rabbit",  name: "玉兔阿月", element: "月光系", desc: "纯净柔软,是你心底最先苏醒的安宁。" },
  { id: "panda",   name: "竹熊禅禅", element: "竹林系", desc: "笨拙又坚定,稳稳地与你同行。" },
  { id: "phoenix", name: "凤雏赤霞", element: "焰火系", desc: "终将涅槃,见证你的浴火重生。" },
];

export function stageFromDays(days: number): PetStage {
  if (days >= 100) return 3;
  if (days >= 30) return 2;
  if (days >= 7) return 1;
  return 0;
}

export const STAGE_LABELS = ["幼年期", "成长期", "成熟期", "圆满形态"];

/**
 * 一个有生命感的小宠物 — 全部用 SVG + JS 动画驱动。
 * - 呼吸缩放 / 上下浮动 / 头部微转
 * - 随机眨眼、耳朵抖动、尾巴/翅膀摆动
 * - 眼球追随光标
 * - 阶段越高,体型越大、装饰越多
 */
export function PetCreature({
  species,
  stage,
  size = 220,
  state = "idle",
}: {
  species: PetSpecies;
  stage: PetStage;
  size?: number;
  state?: "idle" | "happy" | "talking";
}) {
  const [t, setT] = useState(0);
  const [blink, setBlink] = useState(false);
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      setT(now - start);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        schedule();
      }, 2200 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const max = 2.2;
      setEye({ x: (dx / dist) * max, y: (dy / dist) * max });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Stage scale: bigger and more confident as it grows
  const stageScale = [0.85, 0.95, 1.05, 1.15][stage];
  const breath = 1 + Math.sin(t / 700) * 0.025;
  const bob = Math.sin(t / 600) * 2.2;
  const tilt = Math.sin(t / 1300) * 3;
  const happy = state === "happy";
  const talking = state === "talking";

  const lid = blink ? 8 : 0;
  const mouthOpen = talking ? 1 + Math.abs(Math.sin(t / 130)) * 2.5 : 0.6;

  return (
    <div ref={wrapRef} style={{ width: size, height: size }} className="relative select-none">
      {/* glow halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-50"
        style={{ background: `radial-gradient(closest-side, ${HALO[species]} 0%, transparent 70%)` }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{
          transform: `translateY(${bob}px) rotate(${tilt * 0.4}deg) scale(${stageScale * breath})`,
          transformOrigin: "100px 130px",
          overflow: "visible",
        }}
      >
        <defs>
          {/* shared gradients per species */}
          <radialGradient id={`body-${species}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={PALETTES[species].light} />
            <stop offset="60%" stopColor={PALETTES[species].mid} />
            <stop offset="100%" stopColor={PALETTES[species].dark} />
          </radialGradient>
          <radialGradient id={`belly-${species}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PALETTES[species].belly1} />
            <stop offset="100%" stopColor={PALETTES[species].belly2} />
          </radialGradient>
          <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff9aa2" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ff9aa2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* shadow */}
        <ellipse cx="100" cy="184" rx="44" ry="6" fill="#000" opacity="0.18" />

        {/* species-specific body parts */}
        {renderSpecies(species, stage, t, eye, lid, mouthOpen, happy)}

        {/* stage decorations */}
        {stage >= 2 && (
          <g style={{ transform: `translate(${Math.sin(t / 900) * 4}px, ${Math.cos(t / 700) * 3}px)`, transformOrigin: "160px 30px" }}>
            <path d="M158 30 q6 -4 10 2 q-5 6 -11 3 z" fill="#a3d9a5" />
          </g>
        )}
        {stage >= 3 && (
          <>
            {/* halo ring above head */}
            <ellipse
              cx="100" cy="38" rx="26" ry="6"
              fill="none"
              stroke="#ffd86b"
              strokeWidth="2"
              opacity={0.85 + Math.sin(t / 400) * 0.15}
            />
            {/* sparkles */}
            {[0,1,2,3].map((i) => {
              const a = t / 800 + i * 1.6;
              return (
                <g key={i} transform={`translate(${100 + Math.cos(a) * 70}, ${110 + Math.sin(a) * 60})`}>
                  <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#ffd86b" opacity="0.9" />
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}

const HALO: Record<PetSpecies, string> = {
  deer: "#f9d8a7",
  fox: "#c9e6ff",
  rabbit: "#e9defc",
  panda: "#d8f0d0",
  phoenix: "#ffc8a8",
};

const PALETTES: Record<PetSpecies, {
  light: string; mid: string; dark: string;
  belly1: string; belly2: string;
  accent: string;
}> = {
  deer:    { light: "#fde8c4", mid: "#e8b478", dark: "#b27a3f", belly1: "#fff5e0", belly2: "#fde2b8", accent: "#7a4a1a" },
  fox:     { light: "#ffffff", mid: "#dbeeff", dark: "#7fa9d6", belly1: "#ffffff", belly2: "#eaf4ff", accent: "#34537a" },
  rabbit:  { light: "#fbf3ff", mid: "#e8d5ff", dark: "#9a7fc4", belly1: "#ffffff", belly2: "#f2e6ff", accent: "#5a3f8a" },
  panda:   { light: "#ffffff", mid: "#f1f1f1", dark: "#8a8a8a", belly1: "#ffffff", belly2: "#f6f6f6", accent: "#1a1a1a" },
  phoenix: { light: "#ffe6c2", mid: "#ff9b6a", dark: "#c84a2a", belly1: "#fff0d6", belly2: "#ffd29a", accent: "#7a1f0a" },
};

function renderSpecies(
  s: PetSpecies,
  stage: PetStage,
  t: number,
  eye: { x: number; y: number },
  lid: number,
  mouthOpen: number,
  happy: boolean,
) {
  const tail = (happy ? Math.sin(t / 90) * 22 : Math.sin(t / 280) * 10);
  const earL = Math.sin(t / 700) * 4 - 4;
  const earR = Math.sin(t / 700 + 1) * 4 + 4;
  const palette = PALETTES[s];

  // shared eye
  const Eyes = (
    <g>
      <ellipse cx="84" cy="86" rx="7" ry="8" fill="#fff" />
      <ellipse cx="116" cy="86" rx="7" ry="8" fill="#fff" />
      <circle cx={84 + eye.x} cy={86 + eye.y} r="4" fill="#2a1a0a" />
      <circle cx={116 + eye.x} cy={86 + eye.y} r="4" fill="#2a1a0a" />
      <circle cx={85 + eye.x} cy={84.6 + eye.y} r="1.4" fill="#fff" />
      <circle cx={117 + eye.x} cy={84.6 + eye.y} r="1.4" fill="#fff" />
      {/* lids */}
      <rect x="76.5" y={80} width="15" height={lid} rx="6" fill={palette.dark} style={{ transition: "height 90ms" }} />
      <rect x="108.5" y={80} width="15" height={lid} rx="6" fill={palette.dark} style={{ transition: "height 90ms" }} />
    </g>
  );

  // species-specific ears / horns / tail / wings
  switch (s) {
    case "deer":
      return (
        <>
          {/* tail */}
          <g style={{ transformOrigin: "50px 130px", transform: `rotate(${tail}deg)` }}>
            <ellipse cx="46" cy="128" rx="10" ry="7" fill={`url(#body-${s})`} />
            <circle cx="40" cy="124" r="5" fill="#fff5e0" />
          </g>
          {/* body */}
          <ellipse cx="100" cy="138" rx="46" ry="38" fill={`url(#body-${s})`} />
          <ellipse cx="100" cy="148" rx="26" ry="22" fill={`url(#belly-${s})`} />
          {/* legs */}
          <ellipse cx="80" cy="174" rx="7" ry="9" fill={palette.dark} />
          <ellipse cx="120" cy="174" rx="7" ry="9" fill={palette.dark} />
          {/* head */}
          <g style={{ transformOrigin: "100px 80px", transform: `rotate(${Math.sin(t / 1300) * 3}deg)` }}>
            {/* ears */}
            <g style={{ transformOrigin: "76px 50px", transform: `rotate(${earL}deg)` }}>
              <ellipse cx="72" cy="44" rx="9" ry="17" fill={`url(#body-${s})`} />
              <ellipse cx="72" cy="46" rx="4.5" ry="11" fill="#ffc7b5" />
            </g>
            <g style={{ transformOrigin: "124px 50px", transform: `rotate(${earR}deg)` }}>
              <ellipse cx="128" cy="44" rx="9" ry="17" fill={`url(#body-${s})`} />
              <ellipse cx="128" cy="46" rx="4.5" ry="11" fill="#ffc7b5" />
            </g>
            {/* antlers — bigger with stage */}
            {stage >= 1 && (
              <>
                <path d={`M80 36 q-2 -${10 + stage * 4} -8 -${14 + stage * 5} M80 36 q-6 -6 -12 -6`} stroke={palette.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d={`M120 36 q2 -${10 + stage * 4} 8 -${14 + stage * 5} M120 36 q6 -6 12 -6`} stroke={palette.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            )}
            <ellipse cx="100" cy="80" rx="44" ry="40" fill={`url(#body-${s})`} />
            <circle cx="84" cy="64" r="3" fill="#fff5e0" opacity="0.8" />
            <circle cx="118" cy="68" r="2.5" fill="#fff5e0" opacity="0.8" />
            <circle cx="72" cy="92" r="9" fill="url(#cheek)" />
            <circle cx="128" cy="92" r="9" fill="url(#cheek)" />
            {Eyes}
            <ellipse cx="100" cy="100" rx="4.5" ry="3.2" fill="#3a1f10" />
            <path d={`M92 ${107 + mouthOpen} Q100 ${112 + mouthOpen * 1.6} 108 ${107 + mouthOpen}`} stroke="#3a1f10" strokeWidth="2" fill={mouthOpen > 1.2 ? "#a04848" : "none"} strokeLinecap="round" />
          </g>
        </>
      );
    case "fox":
      return (
        <>
          <g style={{ transformOrigin: "46px 130px", transform: `rotate(${tail}deg)` }}>
            <ellipse cx="40" cy="128" rx="14" ry="9" fill={`url(#body-${s})`} />
            <ellipse cx="32" cy="126" rx="6" ry="6" fill="#fff" />
          </g>
          <ellipse cx="100" cy="138" rx="46" ry="38" fill={`url(#body-${s})`} />
          <ellipse cx="100" cy="148" rx="26" ry="22" fill={`url(#belly-${s})`} />
          <ellipse cx="80" cy="174" rx="7" ry="9" fill={palette.dark} />
          <ellipse cx="120" cy="174" rx="7" ry="9" fill={palette.dark} />
          <g style={{ transformOrigin: "100px 80px", transform: `rotate(${Math.sin(t / 1300) * 3}deg)` }}>
            {/* pointy ears */}
            <g style={{ transformOrigin: "76px 50px", transform: `rotate(${earL}deg)` }}>
              <path d="M72 26 L60 56 L84 50 Z" fill={`url(#body-${s})`} />
              <path d="M72 32 L66 52 L80 50 Z" fill="#ffc7b5" />
            </g>
            <g style={{ transformOrigin: "124px 50px", transform: `rotate(${earR}deg)` }}>
              <path d="M128 26 L140 56 L116 50 Z" fill={`url(#body-${s})`} />
              <path d="M128 32 L134 52 L120 50 Z" fill="#ffc7b5" />
            </g>
            <ellipse cx="100" cy="80" rx="44" ry="40" fill={`url(#body-${s})`} />
            {/* fox marks */}
            <path d="M70 90 q10 6 30 6 q20 0 30 -6 l-6 18 q-10 6 -24 6 q-14 0 -24 -6 z" fill="#ffffff" opacity="0.9" />
            <circle cx="72" cy="92" r="9" fill="url(#cheek)" />
            <circle cx="128" cy="92" r="9" fill="url(#cheek)" />
            {Eyes}
            <ellipse cx="100" cy="104" rx="4.5" ry="3.2" fill="#3a1f10" />
            <path d={`M92 ${110 + mouthOpen} Q100 ${115 + mouthOpen * 1.6} 108 ${110 + mouthOpen}`} stroke="#3a1f10" strokeWidth="2" fill={mouthOpen > 1.2 ? "#a04848" : "none"} strokeLinecap="round" />
            {stage >= 2 && (
              <text x="100" y="50" textAnchor="middle" fontSize="14" fill={palette.dark} opacity="0.8">✦</text>
            )}
          </g>
        </>
      );
    case "rabbit":
      return (
        <>
          {/* fluffy tail */}
          <circle cx="46" cy="130" r="9" fill="#fff" />
          <ellipse cx="100" cy="142" rx="44" ry="36" fill={`url(#body-${s})`} />
          <ellipse cx="100" cy="150" rx="24" ry="20" fill={`url(#belly-${s})`} />
          <ellipse cx="82" cy="174" rx="7" ry="9" fill={palette.dark} />
          <ellipse cx="118" cy="174" rx="7" ry="9" fill={palette.dark} />
          <g style={{ transformOrigin: "100px 82px", transform: `rotate(${Math.sin(t / 1300) * 3}deg)` }}>
            {/* long ears */}
            <g style={{ transformOrigin: "82px 56px", transform: `rotate(${earL - 4}deg)` }}>
              <ellipse cx="80" cy={28 + stage * 2} rx="8" ry={28 + stage * 4} fill={`url(#body-${s})`} />
              <ellipse cx="80" cy={28 + stage * 2} rx="3.5" ry={20 + stage * 3} fill="#ffc7e5" />
            </g>
            <g style={{ transformOrigin: "118px 56px", transform: `rotate(${earR + 4}deg)` }}>
              <ellipse cx="120" cy={28 + stage * 2} rx="8" ry={28 + stage * 4} fill={`url(#body-${s})`} />
              <ellipse cx="120" cy={28 + stage * 2} rx="3.5" ry={20 + stage * 3} fill="#ffc7e5" />
            </g>
            <ellipse cx="100" cy="86" rx="42" ry="38" fill={`url(#body-${s})`} />
            <circle cx="74" cy="98" r="9" fill="url(#cheek)" />
            <circle cx="126" cy="98" r="9" fill="url(#cheek)" />
            {Eyes}
            <path d="M96 100 q4 4 8 0" stroke="#3a1f10" strokeWidth="2" fill="#ffb6c1" />
            <path d={`M92 ${112 + mouthOpen} Q100 ${118 + mouthOpen * 1.6} 108 ${112 + mouthOpen}`} stroke="#3a1f10" strokeWidth="2" fill={mouthOpen > 1.2 ? "#a04848" : "none"} strokeLinecap="round" />
          </g>
        </>
      );
    case "panda":
      return (
        <>
          <ellipse cx="100" cy="138" rx="50" ry="40" fill="#ffffff" />
          <ellipse cx="100" cy="148" rx="28" ry="22" fill="#f6f6f6" />
          <ellipse cx="74" cy="172" rx="9" ry="11" fill="#1a1a1a" />
          <ellipse cx="126" cy="172" rx="9" ry="11" fill="#1a1a1a" />
          {/* arms */}
          <ellipse cx="58" cy="138" rx="11" ry="14" fill="#1a1a1a" />
          <ellipse cx="142" cy="138" rx="11" ry="14" fill="#1a1a1a" />
          <g style={{ transformOrigin: "100px 80px", transform: `rotate(${Math.sin(t / 1300) * 3}deg)` }}>
            {/* round ears */}
            <circle cx="68" cy="44" r="14" fill="#1a1a1a" />
            <circle cx="132" cy="44" r="14" fill="#1a1a1a" />
            <ellipse cx="100" cy="80" rx="46" ry="40" fill="#ffffff" />
            {/* eye patches */}
            <ellipse cx="84" cy="86" rx="11" ry="14" fill="#1a1a1a" transform="rotate(-15 84 86)" />
            <ellipse cx="116" cy="86" rx="11" ry="14" fill="#1a1a1a" transform="rotate(15 116 86)" />
            {Eyes}
            <ellipse cx="100" cy="104" rx="5" ry="3.5" fill="#1a1a1a" />
            <path d={`M92 ${112 + mouthOpen} Q100 ${118 + mouthOpen * 1.6} 108 ${112 + mouthOpen}`} stroke="#1a1a1a" strokeWidth="2" fill={mouthOpen > 1.2 ? "#a04848" : "none"} strokeLinecap="round" />
          </g>
          {stage >= 1 && (
            <g style={{ transform: `rotate(${Math.sin(t / 600) * 6}deg)`, transformOrigin: "150px 130px" }}>
              <path d="M148 142 L154 110 L162 116 L156 144 Z" fill="#7fb069" />
              <path d="M152 130 L158 124" stroke="#3f6a3f" strokeWidth="1.2" />
            </g>
          )}
        </>
      );
    case "phoenix":
      return (
        <>
          {/* wings — flap with stage */}
          <g style={{ transformOrigin: "70px 130px", transform: `rotate(${Math.sin(t / (happy ? 140 : 350)) * (10 + stage * 4)}deg)` }}>
            <path d="M70 130 q-40 -10 -50 20 q30 6 56 -8 z" fill={`url(#body-${s})`} />
          </g>
          <g style={{ transformOrigin: "130px 130px", transform: `rotate(${-Math.sin(t / (happy ? 140 : 350)) * (10 + stage * 4)}deg)` }}>
            <path d="M130 130 q40 -10 50 20 q-30 6 -56 -8 z" fill={`url(#body-${s})`} />
          </g>
          <ellipse cx="100" cy="138" rx="40" ry="34" fill={`url(#body-${s})`} />
          <ellipse cx="100" cy="148" rx="22" ry="18" fill={`url(#belly-${s})`} />
          {/* tail feathers */}
          <g style={{ transformOrigin: "100px 170px", transform: `rotate(${Math.sin(t / 400) * 6}deg)` }}>
            <path d="M88 170 q-6 16 -2 24" stroke="#ff6a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M100 172 q0 18 4 26" stroke="#ffaa3a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M112 170 q6 16 10 22" stroke="#ff6a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>
          <g style={{ transformOrigin: "100px 80px", transform: `rotate(${Math.sin(t / 1300) * 3}deg)` }}>
            {/* crown feathers */}
            <path d={`M86 36 q4 -${14 + stage * 4} 14 -${18 + stage * 4} q10 4 14 ${18 + stage * 4}`} stroke="#ff6a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
            <ellipse cx="100" cy="80" rx="40" ry="38" fill={`url(#body-${s})`} />
            <circle cx="74" cy="92" r="8" fill="url(#cheek)" />
            <circle cx="126" cy="92" r="8" fill="url(#cheek)" />
            {Eyes}
            {/* beak */}
            <path d={`M94 100 L100 ${108 + mouthOpen} L106 100 Z`} fill="#e8a23a" />
          </g>
        </>
      );
  }
}
