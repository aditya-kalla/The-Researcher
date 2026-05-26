import { useEffect, useState } from "react";

type Color = "electric" | "lime" | "sakura" | "periwinkle" | "cream";

const COLORS: Record<Color, string> = {
  electric: "var(--accent-primary)",
  lime: "var(--accent-signal)",
  sakura: "var(--accent-alert)",
  periwinkle: "var(--accent-secondary)",
  cream: "var(--text-primary)",
};

const HEIGHTS = { sm: 8, md: 12, lg: 16 } as const;

interface Props {
  value: number;
  label?: string;
  color?: Color;
  size?: keyof typeof HEIGHTS;
  animated?: boolean;
  showValue?: boolean;
}

export function PixelProgressBar({
  value,
  label,
  color = "electric",
  size = "md",
  animated = true,
  showValue = true,
}: Props) {
  const totalBlocks = 24;
  const targetBlocks = Math.max(0, Math.min(totalBlocks, Math.round((value / 100) * totalBlocks)));
  const [filled, setFilled] = useState(animated ? 0 : targetBlocks);

  useEffect(() => {
    if (!animated) {
      setFilled(targetBlocks);
      return;
    }
    setFilled(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setFilled(i);
      if (i >= targetBlocks) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [targetBlocks, animated]);

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between">
          {label && <span className="font-pixel text-[8px] uppercase tracking-wider text-mouse-gray">{label}</span>}
          {showValue && <span className="font-mono text-[11px] text-mono-white">{value}%</span>}
        </div>
      )}
      <div className="flex gap-[1px]" style={{ height: HEIGHTS[size] }}>
        {Array.from({ length: totalBlocks }).map((_, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              backgroundColor: i < filled ? COLORS[color] : "rgba(255,255,255,0.08)",
              minWidth: 6,
            }}
          />
        ))}
      </div>
    </div>
  );
}
