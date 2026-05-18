import { useEffect, useState } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  className?: string;
  cursor?: boolean;
}

export function Typewriter({ text, speed = 40, delay = 0, onComplete, className, cursor = false }: TypewriterProps) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setOut("");
    setDone(false);
    let i = 0;
    let raf = 0;
    let last = 0;
    let started = false;
    const startTime = performance.now() + delay;

    const tick = (t: number) => {
      if (!started) {
        if (t < startTime) {
          raf = requestAnimationFrame(tick);
          return;
        }
        started = true;
        last = t;
      }
      if (t - last >= speed) {
        i++;
        setOut(text.slice(0, i));
        last = t;
        if (i >= text.length) {
          setDone(true);
          onComplete?.();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, delay]);

  return (
    <span className={className}>
      {out}
      {cursor && (!done || cursor) && <span className="cursor-blink">█</span>}
    </span>
  );
}
