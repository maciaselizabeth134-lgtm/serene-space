import { useEffect, useRef, useState } from "react";

export type PetSpecies = "baopao" | "shantuan" | "senmian" | "yexing" | "xingan";
export type PetStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const PET_CATALOG: {
  id: PetSpecies;
  name: string;
  element: string;
  desc: string;
}[] = [
  { id: "baopao",  name: "宝泡啾", element: "贪欲克服系", desc: "奶油金水晶幻兽,腹中藏光,与你一起克服无尽欲望。" },
  { id: "shantuan", name: "闪团丸", element: "懒惰克服系", desc: "天空蓝雷霆能量球,带你冲破停滞与拖延。" },
  { id: "senmian",  name: "森眠灵", element: "暴躁克服系", desc: "薄荷绿森林精灵,温柔安抚你的怒火。" },
  { id: "yexing",   name: "夜星诺", element: "诱惑克服系", desc: "深紫星空小精灵,在诱惑前为你点亮清醒之星。" },
  { id: "xingan",   name: "星安丸", element: "焦虑克服系", desc: "浅蓝星之果冻,稳稳承接你所有不安。" },
];

// 7 stages: 初生 / 感知 / 成长 / 稳定 / 强化 / 觉醒 / 超越
const STAGE_THRESHOLDS = [0, 3, 7, 15, 30, 60, 100];

export function stageFromDays(days: number): PetStage {
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (days >= STAGE_THRESHOLDS[i]) return i as PetStage;
  }
  return 0;
}

export function nextStageThreshold(stage: PetStage): number {
  return STAGE_THRESHOLDS[Math.min(6, stage + 1)];
}

export function currentStageThreshold(stage: PetStage): number {
  return STAGE_THRESHOLDS[stage];
}

export const STAGE_LABELS = [
  "初生态", "感知态", "成长态", "稳定态", "强化态", "觉醒态", "超越态",
];

const PALETTES: Record<PetSpecies, {
  light: string; mid: string; dark: string; core: string; glow: string; halo: string;
}> = {
  baopao:   { light: "#fff4d6", mid: "#ffd87a", dark: "#c98a2a", core: "#fff1a8", glow: "#ffd86b", halo: "#fff0c4" },
  shantuan: { light: "#eaf5ff", mid: "#7fc7ff", dark: "#3a78c8", core: "#ffe98a", glow: "#7fdcff", halo: "#cfe9ff" },
  senmian:  { light: "#eaffe8", mid: "#a6e6b6", dark: "#3a8a5a", core: "#c8ffd8", glow: "#9ce9a6", halo: "#dff7e2" },
  yexing:   { light: "#e6dcff", mid: "#7a5fd0", dark: "#2a1f5a", core: "#fff2a0", glow: "#b29cff", halo: "#d8c8ff" },
  xingan:   { light: "#eaf2ff", mid: "#b9c8ff", dark: "#5a6db5", core: "#ffffff", glow: "#cdd9ff", halo: "#e0e8ff" },
};

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

  // Stage 0..6 — slight growth and confidence
  const stageScale = 0.78 + stage * 0.06;
  const breath = 1 + Math.sin(t / 700) * 0.025;
  const bob = Math.sin(t / 600) * 2.6;
  const tilt = Math.sin(t / 1300) * 2.4;
  const happy = state === "happy";
  const talking = state === "talking";
  const lid = blink ? 8 : 0;
  const mouthOpen = talking ? 1 + Math.abs(Math.sin(t / 130)) * 2.5 : 0.6;

  const palette = PALETTES[species];

  return (
    <div ref={wrapRef} style={{ width: size, height: size }} className="relative select-none">
      {/* outer glow halo, intensifies with stage */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, ${palette.halo} 0%, transparent 70%)`,
          opacity: 0.35 + stage * 0.08,
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{
          transform: `translateY(${bob}px) rotate(${tilt * 0.4}deg) scale(${stageScale * breath})`,
          transformOrigin: "100px 110px",
          overflow: "visible",
        }}
      >
        <defs>
          <radialGradient id={`body-${species}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={palette.light} stopOpacity="0.95" />
            <stop offset="60%" stopColor={palette.mid} stopOpacity="0.9" />
            <stop offset="100%" stopColor={palette.dark} stopOpacity="0.75" />
          </radialGradient>
          <radialGradient id={`core-${species}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor={palette.core} />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`halo-${species}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0.9" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cheek-soft" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff9aa2" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ff9aa2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* floating shadow */}
        <ellipse cx="100" cy="180" rx={36 - stage * 1.5} ry="5" fill="#000" opacity="0.16" />

        {renderSpecies(species, stage, t, eye, lid, mouthOpen, happy, palette)}
      </svg>
    </div>
  );
}

function Eyes({
  cx1, cx2, cy, eye, lid, dark,
}: { cx1: number; cx2: number; cy: number; eye: { x: number; y: number }; lid: number; dark: string }) {
  return (
    <g>
      <ellipse cx={cx1} cy={cy} rx="7" ry="8" fill="#fff" />
      <ellipse cx={cx2} cy={cy} rx="7" ry="8" fill="#fff" />
      <circle cx={cx1 + eye.x} cy={cy + eye.y} r="4" fill="#1a1428" />
      <circle cx={cx2 + eye.x} cy={cy + eye.y} r="4" fill="#1a1428" />
      <circle cx={cx1 + eye.x + 1} cy={cy + eye.y - 1.4} r="1.5" fill="#fff" />
      <circle cx={cx2 + eye.x + 1} cy={cy + eye.y - 1.4} r="1.5" fill="#fff" />
      <rect x={cx1 - 7.5} y={cy - 7} width="15" height={lid} rx="6" fill={dark} style={{ transition: "height 90ms" }} />
      <rect x={cx2 - 7.5} y={cy - 7} width="15" height={lid} rx="6" fill={dark} style={{ transition: "height 90ms" }} />
    </g>
  );
}

function Particles({ count, t, palette, radius = 70, speed = 800 }: {
  count: number; t: number; palette: typeof PALETTES[PetSpecies]; radius?: number; speed?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = t / speed + (i * Math.PI * 2) / count;
        const r = radius + Math.sin(t / 500 + i) * 6;
        const x = 100 + Math.cos(a) * r;
        const y = 100 + Math.sin(a) * r * 0.7;
        return (
          <circle key={i} cx={x} cy={y} r={1.6 + (i % 2)} fill={palette.glow} opacity={0.85} />
        );
      })}
    </>
  );
}

function OrbitRing({ rx, ry, t, palette, opacity = 0.8, dash }: {
  rx: number; ry: number; t: number; palette: typeof PALETTES[PetSpecies]; opacity?: number; dash?: string;
}) {
  return (
    <ellipse
      cx="100"
      cy="100"
      rx={rx}
      ry={ry}
      fill="none"
      stroke={palette.glow}
      strokeWidth="2"
      strokeDasharray={dash}
      opacity={opacity * (0.85 + Math.sin(t / 400) * 0.15)}
      style={{ transformOrigin: "100px 100px", transform: `rotate(${(t / 40) % 360}deg)` }}
    />
  );
}

function renderSpecies(
  s: PetSpecies,
  stage: PetStage,
  t: number,
  eye: { x: number; y: number },
  lid: number,
  mouthOpen: number,
  happy: boolean,
  palette: typeof PALETTES[PetSpecies],
) {
  switch (s) {
    case "baopao":     return renderBaopao(stage, t, eye, lid, mouthOpen, palette);
    case "shantuan":   return renderShantuan(stage, t, eye, lid, mouthOpen, palette, happy);
    case "senmian":    return renderSenmian(stage, t, eye, lid, mouthOpen, palette);
    case "yexing":     return renderYexing(stage, t, eye, lid, mouthOpen, palette);
    case "xingan":     return renderXingan(stage, t, eye, lid, mouthOpen, palette);
    default:           return renderBaopao(stage, t, eye, lid, mouthOpen, palette);
  }
}

/* ============ 宝泡啾 — 贪欲克服系 (cream-gold crystal orb with belly storage) ============ */
function renderBaopao(stage: PetStage, t: number, eye: { x: number; y: number }, lid: number, mouthOpen: number, palette: typeof PALETTES["baopao"]) {
  const coreGlow = 0.4 + stage * 0.1 + Math.sin(t / 400) * 0.1;
  return (
    <>
      {stage >= 4 && <OrbitRing rx={70} ry={22} t={t} palette={palette} />}
      {stage >= 5 && <OrbitRing rx={80} ry={28} t={-t} palette={palette} dash="4 6" />}
      {stage >= 3 && <Particles count={6 + stage} t={t} palette={palette} radius={62 + stage * 2} />}

      {/* coin-melt ears at stage 2+ */}
      {stage >= 2 && (
        <>
          <path d="M62 60 q-10 -8 -8 -22 q12 4 14 18 z" fill={palette.mid} opacity="0.85" />
          <path d="M138 60 q10 -8 8 -22 q-12 4 -14 18 z" fill={palette.mid} opacity="0.85" />
        </>
      )}

      {/* main floating body — round droplet */}
      <ellipse cx="100" cy="105" rx={42 + stage * 1.2} ry={46 + stage * 1.5} fill={`url(#body-baopao)`} />
      {/* crystal highlight */}
      <ellipse cx="86" cy="80" rx="14" ry="22" fill="#ffffff" opacity="0.35" />

      {/* belly storage core — glows brighter with stage */}
      <circle cx="100" cy="118" r={14 + stage * 1.5} fill={`url(#core-baopao)`} opacity={coreGlow + 0.3} />
      {stage >= 1 && (
        <>
          {[0,1,2,3].map((i) => {
            const a = t / 600 + i * 1.6;
            return <circle key={i} cx={100 + Math.cos(a) * (5 + stage)} cy={118 + Math.sin(a) * (5 + stage)} r="1.4" fill="#fff" opacity="0.9" />;
          })}
        </>
      )}

      {/* halo above — stages 3+ */}
      {stage >= 3 && (
        <ellipse cx="100" cy="50" rx={20 + stage * 2} ry="4" fill="none" stroke={palette.glow} strokeWidth="2" opacity={0.6 + Math.sin(t / 400) * 0.2} />
      )}

      {/* face */}
      <Eyes cx1={86} cx2={114} cy={92} eye={eye} lid={lid} dark={palette.dark} />
      <circle cx="74" cy="100" r="6" fill="url(#cheek-soft)" />
      <circle cx="126" cy="100" r="6" fill="url(#cheek-soft)" />
      <path d={`M93 ${102 + mouthOpen} Q100 ${107 + mouthOpen * 1.6} 107 ${102 + mouthOpen}`} stroke={palette.dark} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* transcendence stage 6: dissolve into pure light */}
      {stage >= 6 && (
        <>
          <circle cx="100" cy="105" r="55" fill={palette.glow} opacity="0.18" />
          <circle cx="100" cy="105" r="35" fill="#ffffff" opacity="0.25" />
        </>
      )}
    </>
  );
}

/* ============ 闪团丸 — 懒惰克服系 (sky-blue lightning ball with thrusters) ============ */
function renderShantuan(stage: PetStage, t: number, eye: { x: number; y: number }, lid: number, mouthOpen: number, palette: typeof PALETTES["shantuan"], happy: boolean) {
  const dash = (t / (happy ? 80 : 200)) % 20;
  return (
    <>
      {stage >= 4 && <OrbitRing rx={75} ry={20} t={t * 1.5} palette={palette} dash="2 5" />}
      {stage >= 5 && (
        <>
          {/* energy wings */}
          <path d="M40 110 q-20 -10 -28 4 q14 12 32 4 z" fill={palette.glow} opacity="0.6" />
          <path d="M160 110 q20 -10 28 4 q-14 12 -32 4 z" fill={palette.glow} opacity="0.6" />
        </>
      )}

      {/* speed lines below — stage 1+ */}
      {stage >= 1 && (
        <g opacity={0.5 + stage * 0.06}>
          {[0,1,2,3,4].map((i) => (
            <line key={i} x1={70 + i * 15} y1={170} x2={60 + i * 15 + (dash * 0.5)} y2={170} stroke={palette.glow} strokeWidth="1.5" strokeLinecap="round" />
          ))}
        </g>
      )}

      {/* thruster flames — stage 3+ */}
      {stage >= 3 && (
        <>
          <path d="M80 150 q-4 16 0 22 q4 -6 4 -22 z" fill={palette.glow} opacity="0.85" />
          <path d="M120 150 q4 16 0 22 q-4 -6 -4 -22 z" fill={palette.glow} opacity="0.85" />
        </>
      )}

      {/* main round body */}
      <circle cx="100" cy="105" r={40 + stage * 1.2} fill={`url(#body-shantuan)`} />
      <ellipse cx="86" cy="82" rx="12" ry="18" fill="#ffffff" opacity="0.4" />

      {/* lightning antenna on top */}
      <path d={`M100 ${65 - stage * 2} L96 50 L102 50 L98 ${42 - stage * 3}`} stroke={palette.core} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx={98} cy={42 - stage * 3} r={3 + stage * 0.4} fill={palette.core} opacity={0.8 + Math.sin(t/200)*0.2} />

      {/* lightning trails — stage 4+ */}
      {stage >= 4 && (
        <g opacity="0.85">
          {[0,1,2].map((i) => {
            const a = t / 300 + i * 2.1;
            return <path key={i} d={`M${100 + Math.cos(a)*55} ${100 + Math.sin(a)*45} l3 -4 l-2 0 l3 -5`} stroke={palette.core} strokeWidth="1.5" fill="none" strokeLinecap="round" />;
          })}
        </g>
      )}

      {/* crown of thunder — stage 5+ */}
      {stage >= 5 && (
        <path d={`M76 56 L84 40 L92 56 L100 36 L108 56 L116 40 L124 56`} stroke={palette.core} strokeWidth="2" fill="none" strokeLinejoin="round" opacity="0.9" />
      )}

      <Eyes cx1={88} cx2={112} cy={100} eye={eye} lid={lid} dark={palette.dark} />
      <path d={`M93 ${112 + mouthOpen} Q100 ${117 + mouthOpen * 1.6} 107 ${112 + mouthOpen}`} stroke={palette.dark} strokeWidth="2" fill="none" strokeLinecap="round" />

      {stage >= 6 && (
        <>
          <circle cx="100" cy="100" r="60" fill={palette.core} opacity="0.18" />
          <path d="M70 100 L90 70 L88 100 L110 60 L106 102 L130 80" stroke={palette.core} strokeWidth="3" fill="none" opacity="0.6" />
        </>
      )}
    </>
  );
}

/* ============ 森眠灵 — 暴躁克服系 (mint forest sprite, vines + heart core) ============ */
function renderSenmian(stage: PetStage, t: number, eye: { x: number; y: number }, lid: number, mouthOpen: number, palette: typeof PALETTES["senmian"]) {
  return (
    <>
      {stage >= 4 && <OrbitRing rx={72} ry={22} t={t * 0.6} palette={palette} dash="6 4" />}
      {stage >= 3 && <Particles count={5 + stage} t={t} palette={palette} radius={64} speed={1100} />}

      {/* leaf wings — stage 4+ */}
      {stage >= 4 && (
        <>
          <path d="M44 110 q-22 -8 -28 6 q12 14 30 4 z" fill={palette.mid} opacity="0.8" />
          <path d="M156 110 q22 -8 28 6 q-12 14 -30 4 z" fill={palette.mid} opacity="0.8" />
        </>
      )}

      {/* fluffy marshmallow body */}
      <ellipse cx="100" cy="115" rx={44 + stage * 1.2} ry={42 + stage * 1.2} fill={`url(#body-senmian)`} />
      <ellipse cx="86" cy="92" rx="14" ry="20" fill="#ffffff" opacity="0.45" />

      {/* heart core held to chest */}
      <g style={{ transform: `translateY(${Math.sin(t/500)*1.5}px)`, transformOrigin: "100px 122px" }}>
        <path
          d="M100 132 C 90 120, 78 124, 86 110 C 92 100, 100 110, 100 110 C 100 110, 108 100, 114 110 C 122 124, 110 120, 100 132 Z"
          fill={palette.core}
          opacity={0.85 + Math.sin(t/350)*0.15}
        />
      </g>

      {/* vine sprouts on head */}
      <g style={{ transformOrigin: "100px 70px", transform: `rotate(${Math.sin(t/900)*5}deg)` }}>
        <path d={`M92 70 q-4 -${10 + stage * 3} -10 -${14 + stage * 3}`} stroke={palette.dark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d={`M108 70 q4 -${10 + stage * 3} 10 -${14 + stage * 3}`} stroke={palette.dark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {stage >= 1 && (
          <>
            <ellipse cx={82 - stage} cy={56 - stage * 3} rx="5" ry="8" fill={palette.mid} transform={`rotate(-30 ${82 - stage} ${56 - stage * 3})`} />
            <ellipse cx={118 + stage} cy={56 - stage * 3} rx="5" ry="8" fill={palette.mid} transform={`rotate(30 ${118 + stage} ${56 - stage * 3})`} />
          </>
        )}
      </g>

      {/* vine crown halo — stage 5+ */}
      {stage >= 5 && (
        <path d="M70 50 q30 -22 60 0" stroke={palette.dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      )}

      <Eyes cx1={86} cx2={114} cy={100} eye={eye} lid={lid} dark={palette.dark} />
      <circle cx="74" cy="108" r="6" fill="url(#cheek-soft)" />
      <circle cx="126" cy="108" r="6" fill="url(#cheek-soft)" />
      <path d={`M93 ${112 + mouthOpen} Q100 ${116 + mouthOpen * 1.6} 107 ${112 + mouthOpen}`} stroke={palette.dark} strokeWidth="2" fill="none" strokeLinecap="round" />

      {stage >= 6 && (
        <circle cx="100" cy="115" r="55" fill={palette.mid} opacity="0.2" />
      )}
    </>
  );
}

/* ============ 夜星诺 — 诱惑克服系 (deep purple star-demon with cape) ============ */
function renderYexing(stage: PetStage, t: number, eye: { x: number; y: number }, lid: number, mouthOpen: number, palette: typeof PALETTES["yexing"]) {
  return (
    <>
      {stage >= 4 && <OrbitRing rx={78} ry={24} t={t} palette={palette} />}
      {stage >= 5 && <OrbitRing rx={88} ry={32} t={-t * 0.7} palette={palette} dash="3 7" />}
      {stage >= 2 && <Particles count={5 + stage} t={t} palette={palette} radius={60 + stage * 2} speed={900} />}

      {/* star cape behind body */}
      {stage >= 3 && (
        <path d={`M60 100 q-${10 + stage * 4} ${30 + stage * 4} 10 ${50 + stage * 3} q30 -10 60 0 q${20 + stage * 4} -${20 + stage * 4} ${10 + stage * 4} -${50 + stage * 3} z`}
          fill={palette.dark} opacity={0.3 + stage * 0.05}
        />
      )}

      {/* main body */}
      <ellipse cx="100" cy="110" rx={38 + stage * 1.2} ry={42 + stage * 1.2} fill={`url(#body-yexing)`} />
      <ellipse cx="86" cy="86" rx="12" ry="18" fill="#ffffff" opacity="0.3" />

      {/* moon horns */}
      <path d={`M76 60 q-${4 + stage} -${8 + stage * 2} 4 -${14 + stage * 2} q4 6 2 ${12 + stage}`} fill={palette.core} opacity="0.95" />
      <path d={`M124 60 q${4 + stage} -${8 + stage * 2} -4 -${14 + stage * 2} q-4 6 -2 ${12 + stage}`} fill={palette.core} opacity="0.95" />

      {/* moon halo crown — stage 5+ */}
      {stage >= 5 && (
        <ellipse cx="100" cy="48" rx={24 + stage * 1.5} ry="5" fill="none" stroke={palette.core} strokeWidth="2" opacity="0.85" />
      )}

      {/* star tail / silver tail — stage 2+ */}
      {stage >= 2 && (
        <g style={{ transformOrigin: "60px 140px", transform: `rotate(${Math.sin(t/700)*8}deg)` }}>
          <path d={`M58 140 q-${10 + stage * 3} ${10 + stage * 2} -${4 + stage} ${22 + stage * 3}`} stroke={palette.core} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M52 162 L54 158 L58 160 L55 163 L57 167 L52 165 L48 168 L50 163 Z" fill={palette.core} opacity="0.95" />
        </g>
      )}

      <Eyes cx1={86} cx2={114} cy={96} eye={eye} lid={lid} dark={palette.dark} />
      <path d={`M93 ${108 + mouthOpen} Q100 ${112 + mouthOpen * 1.6} 107 ${108 + mouthOpen}`} stroke={palette.core} strokeWidth="2" fill="none" strokeLinecap="round" />

      {stage >= 6 && (
        <>
          <circle cx="100" cy="110" r="58" fill={palette.dark} opacity="0.25" />
          <circle cx="100" cy="110" r="14" fill={palette.core} opacity="0.7" />
        </>
      )}
    </>
  );
}

/* ============ 星安丸 — 焦虑克服系 (pale blue star jelly with calm core) ============ */
function renderXingan(stage: PetStage, t: number, eye: { x: number; y: number }, lid: number, mouthOpen: number, palette: typeof PALETTES["xingan"]) {
  return (
    <>
      {stage >= 4 && <OrbitRing rx={72} ry={22} t={t} palette={palette} />}
      {stage >= 4 && <OrbitRing rx={84} ry={28} t={-t * 0.8} palette={palette} dash="2 6" />}
      {stage >= 3 && <Particles count={6 + stage} t={t} palette={palette} radius={64} />}

      {/* cloud antennae on head */}
      <g>
        <circle cx={84 - stage} cy={62 - stage * 2} r={5 + stage * 0.5} fill={palette.mid} opacity="0.85" />
        <circle cx={116 + stage} cy={62 - stage * 2} r={5 + stage * 0.5} fill={palette.mid} opacity="0.85" />
      </g>

      {/* nebula cape — stage 5+ */}
      {stage >= 5 && (
        <ellipse cx="100" cy="130" rx={62 + stage * 2} ry={28} fill={palette.mid} opacity="0.3" />
      )}

      {/* main soft body — gently rounded */}
      <path
        d={`M${60 - stage} 110 Q60 ${60 - stage * 2} 100 ${60 - stage * 2} Q${140 + stage} ${60 - stage * 2} ${140 + stage} 110 Q${140 + stage} ${160 + stage} 100 ${160 + stage} Q${60 - stage} ${160 + stage} ${60 - stage} 110 Z`}
        fill={`url(#body-xingan)`}
      />
      <ellipse cx="86" cy="84" rx="12" ry="18" fill="#ffffff" opacity="0.5" />

      {/* calm star core on chest */}
      <g style={{ transformOrigin: "100px 122px", transform: `rotate(${(t/100)%360}deg)` }}>
        <path
          d="M100 110 L104 119 L113 120 L106 126 L108 135 L100 130 L92 135 L94 126 L87 120 L96 119 Z"
          fill={palette.core}
          opacity={0.85 + Math.sin(t/400)*0.15}
        />
      </g>

      {/* star ribbon tail — stage 2+ */}
      {stage >= 2 && (
        <g style={{ transformOrigin: "100px 160px", transform: `rotate(${Math.sin(t/800)*6}deg)` }}>
          <path d={`M90 160 q-${4 + stage} ${10 + stage * 2} 0 ${20 + stage * 2}`} stroke={palette.mid} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d={`M110 160 q${4 + stage} ${10 + stage * 2} 0 ${20 + stage * 2}`} stroke={palette.mid} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}

      <Eyes cx1={86} cx2={114} cy={92} eye={eye} lid={lid} dark={palette.dark} />
      <circle cx="74" cy="100" r="6" fill="url(#cheek-soft)" />
      <circle cx="126" cy="100" r="6" fill="url(#cheek-soft)" />
      <path d={`M93 ${104 + mouthOpen} Q100 ${108 + mouthOpen * 1.6} 107 ${104 + mouthOpen}`} stroke={palette.dark} strokeWidth="2" fill="none" strokeLinecap="round" />

      {stage >= 6 && (
        <>
          <circle cx="100" cy="110" r="58" fill={palette.mid} opacity="0.22" />
          <circle cx="100" cy="122" r="10" fill={palette.core} opacity="0.85" />
        </>
      )}
    </>
  );
}
