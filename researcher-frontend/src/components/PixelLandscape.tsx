import { useMemo } from "react";

const C = {
  skyTop: "#0D1B3E",
  sky2: "#1A2D5A",
  sky3: "#2E4A7A",
  sky4: "#4A6B8A",
  cloud: "#6A7A8A",
  cloudHi: "#8A9AAA",
  star: "#F5EDD3",
  moon: "#F5EDD3",
  hillBack: "#1A3A5A",
  hillMid: "#2A5A4A",
  hillFront: "#2A4A2A",
  pineDark: "#1A3A1A",
  pineMid: "#2A5A2A",
  pineLite: "#3A6A3A",
  trunk: "#1A1208",
  skin: "#D4956A",
  glasses: "#FAFAFA",
  body: "#3A2A6A",
  laptop: "#1A1A2A",
  glow: "#7B6FFF",
};

const P = 4;

interface Tree {
  x: number;
  y: number;
  size: 0 | 1 | 2;
  shade: 0 | 1 | 2;
}

function PineTree({ t }: { t: Tree }) {
  // Inverted-triangle pine: wide layered top stacking → narrow trunk
  const layerCounts: Array<number[]> = [
    [3, 2, 1],
    [4, 3, 2, 1],
    [5, 4, 3, 2, 1],
  ];
  const widths = layerCounts[t.size];
  const palette = [C.pineDark, C.pineMid, C.pineLite];
  const top = palette[t.shade];
  const bottom = palette[Math.max(0, t.shade - 1)];
  return (
    <g transform={`translate(${t.x},${t.y})`}>
      {widths.map((w, i) => {
        const wpx = w * P * 2;
        const yy = -i * P * 2 - P * 2;
        return (
          <rect
            key={i}
            x={-wpx / 2}
            y={yy}
            width={wpx}
            height={P * 2}
            fill={i === 0 ? bottom : top}
          />
        );
      })}
      <rect x={-P / 2} y={-P} width={P} height={P * 2} fill={C.trunk} />
    </g>
  );
}

export function PixelLandscape({
  parallaxOffset = 0,
  className = "",
}: {
  parallaxOffset?: number;
  className?: string;
}) {
  const trees = useMemo<Tree[]>(() => {
    const arr: Tree[] = [];
    // Mid-hill row (further back, smaller)
    for (let i = 0; i < 8; i++) {
      arr.push({
        x: 30 + i * 95 + Math.sin(i * 1.3) * 18,
        y: 218 + Math.sin(i * 0.9) * 6,
        size: (i % 2 === 0 ? 0 : 1) as 0 | 1,
        shade: 0,
      });
    }
    // Front-hill row (larger)
    for (let i = 0; i < 8; i++) {
      arr.push({
        x: 60 + i * 100 + Math.cos(i * 1.7) * 14,
        y: 258 + Math.sin(i * 1.4) * 5,
        size: (i % 3 === 0 ? 2 : 1) as 1 | 2,
        shade: i % 2 === 0 ? 1 : 2,
      });
    }
    return arr;
  }, []);

  const stars = useMemo(
    () => [
      { x: 90, y: 30 },
      { x: 180, y: 58 },
      { x: 320, y: 22 },
      { x: 470, y: 70 },
      { x: 610, y: 28 },
      { x: 720, y: 60 },
    ],
    []
  );

  return (
    <svg
      viewBox="0 0 800 320"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ transform: `translateY(${parallaxOffset}px)` }}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.skyTop} />
          <stop offset="40%" stopColor={C.sky2} />
          <stop offset="75%" stopColor={C.sky3} />
          <stop offset="100%" stopColor={C.sky4} />
        </linearGradient>
        <radialGradient id="charGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.glow} stopOpacity="0.45" />
          <stop offset="100%" stopColor={C.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky gradient */}
      <rect x={0} y={0} width={800} height={200} fill="url(#sky)" />

      {/* Stars (2x2 px) */}
      {stars.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={2} height={2} fill={C.star} />
      ))}

      {/* Crescent moon — arc of small white rects */}
      <g transform="translate(680,42)">
        <rect x={0} y={0} width={4} height={4} fill={C.moon} />
        <rect x={4} y={-4} width={4} height={4} fill={C.moon} />
        <rect x={8} y={-4} width={4} height={4} fill={C.moon} />
        <rect x={12} y={0} width={4} height={4} fill={C.moon} />
        <rect x={12} y={4} width={4} height={4} fill={C.moon} />
        <rect x={8} y={8} width={4} height={4} fill={C.moon} />
        <rect x={4} y={8} width={4} height={4} fill={C.moon} />
        <rect x={0} y={4} width={4} height={4} fill={C.moon} />
      </g>

      {/* Chunky pixel clouds */}
      <g>
        {/* cloud 1 */}
        <g transform="translate(120,90)" fill={C.cloud}>
          <rect x={0} y={4} width={32} height={6} />
          <rect x={6} y={-2} width={28} height={6} />
          <rect x={14} y={-8} width={16} height={6} />
          <rect x={4} y={10} width={24} height={4} fill={C.cloudHi} />
        </g>
        {/* cloud 2 */}
        <g transform="translate(380,60)" fill={C.cloud}>
          <rect x={0} y={4} width={48} height={6} />
          <rect x={8} y={-2} width={36} height={6} />
          <rect x={18} y={-8} width={20} height={6} />
          <rect x={6} y={10} width={36} height={4} fill={C.cloudHi} />
        </g>
        {/* cloud 3 */}
        <g transform="translate(540,110)" fill={C.cloud}>
          <rect x={0} y={4} width={40} height={6} />
          <rect x={6} y={-2} width={30} height={6} />
          <rect x={4} y={10} width={28} height={4} fill={C.cloudHi} />
        </g>
      </g>

      {/* Back hill — jagged dark blue-purple */}
      <path
        d="M0,200 L40,182 L80,194 L130,170 L180,188 L240,160 L300,182 L360,166 L420,184 L480,162 L540,180 L600,168 L660,188 L720,170 L800,184 L800,320 L0,320 Z"
        fill={C.hillBack}
      />

      {/* Mid hill — rounded teal */}
      <path
        d="M0,232 L80,212 L170,228 L260,206 L360,222 L460,210 L570,224 L680,212 L800,228 L800,320 L0,320 Z"
        fill={C.hillMid}
      />

      {/* Mid trees */}
      {trees.filter((t) => t.shade === 0).map((t, i) => (
        <PineTree key={`m${i}`} t={t} />
      ))}

      {/* Front hill — deep green rolling */}
      <path
        d="M0,272 L100,260 L220,272 L340,256 L460,270 L580,258 L700,272 L800,266 L800,320 L0,320 Z"
        fill={C.hillFront}
      />

      {/* Front trees */}
      {trees.filter((t) => t.shade !== 0).map((t, i) => (
        <PineTree key={`f${i}`} t={t} />
      ))}

      {/* Researcher glow */}
      <ellipse cx={400} cy={278} rx={48} ry={20} fill="url(#charGlow)" />

      {/* Researcher — sitting cross-legged with laptop, ~32px scaled 3x */}
      <g transform="translate(400,278) scale(3)">
        {/* head */}
        <rect x={-5} y={-18} width={10} height={9} fill={C.skin} />
        {/* hair */}
        <rect x={-5} y={-19} width={10} height={3} fill="#2A1810" />
        {/* glasses (two 2x2 white rects) */}
        <rect x={-4} y={-15} width={2} height={2} fill={C.glasses} />
        <rect x={2} y={-15} width={2} height={2} fill={C.glasses} />
        {/* body */}
        <rect x={-7} y={-9} width={14} height={9} fill={C.body} />
        {/* arms */}
        <rect x={-9} y={-6} width={2} height={5} fill={C.body} />
        <rect x={7} y={-6} width={2} height={5} fill={C.body} />
        {/* crossed legs */}
        <rect x={-9} y={0} width={18} height={3} fill={C.body} />
        {/* laptop base */}
        <rect x={-7} y={-2} width={14} height={2} fill={C.laptop} />
        {/* laptop screen */}
        <rect x={-6} y={-5} width={12} height={3} fill={C.laptop} />
        {/* glowing screen */}
        <rect x={-2} y={-4} width={2} height={2} fill={C.glow} />
        <rect x={0} y={-4} width={2} height={2} fill="#A8B4FF" />
      </g>
    </svg>
  );
}
