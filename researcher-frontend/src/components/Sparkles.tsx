import { useMemo } from "react";
import { motion } from "framer-motion";

export function Sparkles({ count = 24 }: { count?: number }) {
  const items = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      drift: 150 + Math.random() * 100,
      duration: 15 + Math.random() * 10,
      delay: Math.random() * 8,
      size: 8 + Math.random() * 10,
      color: i % 2 === 0 ? "#A8B4FF" : "#F5EDD3",
      char: i % 3 === 0 ? "♡" : i % 5 === 0 ? "+" : "✦",
      opacity: 0.05 + Math.random() * 0.2,
    }));
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((s) => (
        <motion.span
          key={s.id}
          className="absolute font-pixel"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            fontSize: s.size,
            color: s.color,
            opacity: s.opacity,
          }}
          animate={{ y: [0, -s.drift, 0] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        >
          {s.char}
        </motion.span>
      ))}
    </div>
  );
}
