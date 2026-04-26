import { useEffect, useRef, useState } from "react";

type State = "idle" | "happy" | "talking" | "sleeping" | "dragging";

interface Props {
  size?: number;
  state?: State;
  /** Origin point in viewport coords for eye-tracking */
  originX: number;
  originY: number;
}

/**
 * A living little fawn — built entirely from SVG + JS-driven micro-animations.
 * - Breathes (body scale)
 * - Blinks every few seconds
 * - Ears twitch occasionally
 * - Tail wags
 * - Eyes track the cursor
 * - Bobs gently like a stuffed toy
 */
export function PetAvatar({ size = 64, state = "idle", originX, originY }: Props) {
  const [t, setT] = useState(0); // animation tick (ms)
  const [blink, setBlink] = useState(false);
  const [earTwitch, setEarTwitch] = useState(false);
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  // RAF loop for time-based animations
  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      setT(now - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Random blinks
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 2200 + Math.random() * 3000;
      timer = setTimeout(() => {
        setBlink(true);
        // double-blink occasionally
        const isDouble = Math.random() < 0.25;
        setTimeout(() => {
          setBlink(false);
          if (isDouble) {
            setTimeout(() => setBlink(true), 120);
            setTimeout(() => setBlink(false), 240);
          }
        }, 130);
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Random ear twitches
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setEarTwitch(true);
        setTimeout(() => setEarTwitch(false), 350);
        schedule();
      }, 4000 + Math.random() * 6000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Eye tracking — follow the cursor
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - originX;
      const dy = e.clientY - originY;
      const dist = Math.hypot(dx, dy) || 1;
      const max = 1.6; // pixels of pupil shift
      setEye({ x: (dx / dist) * max, y: (dy / dist) * max });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [originX, originY]);

  // Derived motion
  const breath = 1 + Math.sin(t / 700) * 0.025; // body breathing
  const bob = Math.sin(t / 600) * 1.5;          // vertical bob
  const tilt = Math.sin(t / 1100) * 2;          // slight head tilt
  const tailAngle = state === "happy"
    ? Math.sin(t / 90) * 22
    : Math.sin(t / 280) * 10;
  const earL = (earTwitch ? Math.sin(t / 50) * 6 : 0) - 4;
  const earR = (earTwitch ? Math.sin(t / 50 + 1) * 6 : 0) + 4;

  const isSleeping = state === "sleeping";
  const isTalking = state === "talking";
  const isDragging = state === "dragging";

  // Mouth opens slightly while talking
  const mouthOpen = isTalking ? 1 + Math.abs(Math.sin(t / 120)) * 2 : 0.5;

  // Eye lid height
  const lidHeight = isSleeping ? 7 : blink ? 7 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        transform: `translateY(${bob}px) rotate(${isDragging ? tilt * 3 : tilt}deg)`,
        transition: "filter 200ms",
        filter: isDragging ? "brightness(1.05)" : undefined,
        overflow: "visible",
      }}
    >
      <defs>
        <radialGradient id="pet-body" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fde8c4" />
          <stop offset="60%" stopColor="#e8b478" />
          <stop offset="100%" stopColor="#b27a3f" />
        </radialGradient>
        <radialGradient id="pet-belly" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff5e0" />
          <stop offset="100%" stopColor="#fde2b8" />
        </radialGradient>
        <radialGradient id="pet-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff9aa2" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff9aa2" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft shadow under feet */}
      <ellipse cx="50" cy="92" rx="22" ry="3.5" fill="#000" opacity="0.18" />

      {/* Tail — wagging */}
      <g style={{ transformOrigin: "30px 62px", transform: `rotate(${tailAngle}deg)` }}>
        <ellipse cx="22" cy="60" rx="6" ry="4" fill="url(#pet-body)" />
        <circle cx="18" cy="58" r="3" fill="#fff5e0" />
      </g>

      {/* Body */}
      <g style={{ transformOrigin: "50px 70px", transform: `scale(${breath})` }}>
        <ellipse cx="50" cy="68" rx="24" ry="20" fill="url(#pet-body)" />
        <ellipse cx="50" cy="74" rx="14" ry="12" fill="url(#pet-belly)" />
        {/* Legs */}
        <ellipse cx="40" cy="86" rx="4" ry="5" fill="#8a5a2a" />
        <ellipse cx="60" cy="86" rx="4" ry="5" fill="#8a5a2a" />
      </g>

      {/* Head — slight bob independent from body */}
      <g
        style={{
          transformOrigin: "50px 40px",
          transform: `translateY(${Math.sin(t / 800) * 0.8}px) rotate(${Math.sin(t / 1300) * 3}deg)`,
        }}
      >
        {/* Ears */}
        <g style={{ transformOrigin: "38px 26px", transform: `rotate(${earL}deg)` }}>
          <ellipse cx="36" cy="22" rx="5" ry="9" fill="url(#pet-body)" />
          <ellipse cx="36" cy="23" rx="2.5" ry="6" fill="#ffc7b5" />
        </g>
        <g style={{ transformOrigin: "62px 26px", transform: `rotate(${earR}deg)` }}>
          <ellipse cx="64" cy="22" rx="5" ry="9" fill="url(#pet-body)" />
          <ellipse cx="64" cy="23" rx="2.5" ry="6" fill="#ffc7b5" />
        </g>

        {/* Tiny antlers */}
        <path d="M40 18 q-1 -6 -4 -8 M40 18 q-3 -3 -6 -3" stroke="#7a4a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M60 18 q1 -6 4 -8 M60 18 q3 -3 6 -3" stroke="#7a4a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Face */}
        <ellipse cx="50" cy="40" rx="22" ry="20" fill="url(#pet-body)" />

        {/* White spots */}
        <circle cx="42" cy="32" r="2" fill="#fff5e0" opacity="0.7" />
        <circle cx="58" cy="34" r="1.5" fill="#fff5e0" opacity="0.7" />
        <circle cx="62" cy="46" r="1.2" fill="#fff5e0" opacity="0.7" />

        {/* Cheeks */}
        <circle cx="36" cy="46" r="5" fill="url(#pet-cheek)" />
        <circle cx="64" cy="46" r="5" fill="url(#pet-cheek)" />

        {/* Eyes */}
        <g>
          {/* whites */}
          <ellipse cx="42" cy="40" rx="3.6" ry="4.2" fill="#fff" />
          <ellipse cx="58" cy="40" rx="3.6" ry="4.2" fill="#fff" />
          {/* pupils — track cursor */}
          <circle cx={42 + eye.x} cy={40 + eye.y} r="2.2" fill="#2a1a0a" />
          <circle cx={58 + eye.x} cy={40 + eye.y} r="2.2" fill="#2a1a0a" />
          {/* highlights */}
          <circle cx={42.7 + eye.x} cy={39.2 + eye.y} r="0.8" fill="#fff" />
          <circle cx={58.7 + eye.x} cy={39.2 + eye.y} r="0.8" fill="#fff" />

          {/* Eyelids — for blinking / sleeping */}
          <rect
            x="38.4"
            y={35.8}
            width="7.2"
            height={lidHeight}
            rx="3"
            fill="#b27a3f"
            style={{ transition: "height 90ms ease" }}
          />
          <rect
            x="54.4"
            y={35.8}
            width="7.2"
            height={lidHeight}
            rx="3"
            fill="#b27a3f"
            style={{ transition: "height 90ms ease" }}
          />
          {isSleeping && (
            <text x="70" y="22" fontSize="10" fill="#7a9eff" fontWeight="700">z</text>
          )}
        </g>

        {/* Nose */}
        <ellipse cx="50" cy="48" rx="2.2" ry="1.6" fill="#3a1f10" />
        {/* Mouth */}
        <path
          d={`M46 ${52 + mouthOpen} Q50 ${54 + mouthOpen * 1.6} 54 ${52 + mouthOpen}`}
          stroke="#3a1f10"
          strokeWidth="1.4"
          fill={isTalking ? "#a04848" : "none"}
          strokeLinecap="round"
        />
      </g>

      {/* Floating leaf accent */}
      <g
        style={{
          transform: `translate(${Math.sin(t / 900) * 3}px, ${-2 + Math.cos(t / 700) * 2}px) rotate(${Math.sin(t / 1000) * 15}deg)`,
          transformOrigin: "78px 18px",
          opacity: state === "idle" || state === "happy" ? 1 : 0.4,
        }}
      >
        <path d="M78 14 q4 -2 6 2 q-3 4 -7 2 z" fill="#7fb069" />
        <path d="M80 16 l3 -1" stroke="#5a8a4a" strokeWidth="0.6" />
      </g>
    </svg>
  );
}