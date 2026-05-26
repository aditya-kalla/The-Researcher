import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";

const THEMES = [
  { id: "observatory" as const, label: "OBS" },
  { id: "light" as const, label: "LGT" },
  { id: "dark" as const, label: "DRK" },
  { id: "neo" as const, label: "NEO" },
] as const;

// Approximate CSS filters applied to the transparent orb.gif
const ORB_FILTERS: Record<typeof THEMES[number]["id"], string> = {
  observatory: "hue-rotate(45deg) saturate(1.5) brightness(1.1)",
  light: "sepia(0.8) hue-rotate(-10deg) saturate(1.2) contrast(1.2) brightness(0.9)",
  dark: "hue-rotate(140deg) saturate(0.65) brightness(0.75) contrast(1.7) drop-shadow(0 0 8px rgba(150,20,20,0.4))",
  neo: "grayscale(1) brightness(1.8) contrast(1.2) drop-shadow(0 0 5px rgba(255,255,255,0.4))",
};

const RAIL_STYLES: Record<typeof THEMES[number]["id"], { bg: string, border: string, shadow: string }> = {
  observatory: { bg: "rgba(10,12,24,0.75)", border: "rgba(123,111,255,0.25)", shadow: "0 8px 32px rgba(10,12,24,0.9), inset 0 0 16px rgba(123,111,255,0.05)" },
  light: { bg: "rgba(253,246,227,0.75)", border: "rgba(200,146,42,0.3)", shadow: "0 8px 32px rgba(139,94,26,0.15), inset 0 0 16px rgba(255,255,255,0.6)" },
  dark: { bg: "rgba(5,5,5,0.7)", border: "rgba(255,255,255,0.15)", shadow: "0 8px 32px rgba(0,0,0,0.95), inset 0 0 16px rgba(255,255,255,0.03)" },
  neo: { bg: "rgba(8,12,20,0.75)", border: "rgba(138,168,200,0.3)", shadow: "0 8px 32px rgba(0,0,0,0.9), inset 0 0 16px rgba(138,168,200,0.1)" },
};

export function ThemeSwitcher() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the rail when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = (id: typeof THEMES[number]["id"]) => {
    document.documentElement.classList.add("theme-transitioning");
    setTheme(id);
    setIsOpen(false);
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 400);
  };

  return (
    <div className="relative flex items-center h-full" ref={containerRef}>
      {/* TRIGGER ORB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center gap-2 outline-none"
      >
        <div className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-500 ${
          theme === "light" 
            ? "border border-[#C8922A]/40 bg-[#C8922A]/10 shadow-[0_2px_6px_rgba(200,146,42,0.2)]" 
            : ""
        }`}>
          <motion.img
            src="/assets/orb.gif"
            alt="THEME"
            className="w-full h-full object-contain transition-all duration-700 ease-in-out"
            style={{ 
              filter: ORB_FILTERS[theme],
              mixBlendMode: theme === "light" ? "normal" : "screen" 
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          />
        </div>
        <span className="font-pixel text-[6.5px] tracking-[0.2em] opacity-40 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:opacity-80 transition-all duration-300 translate-y-[1px]">
          THEME
        </span>
      </button>

      {/* RETRACTABLE RAIL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -5 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-[100%] right-0 mt-3 flex flex-col items-center gap-1 overflow-hidden rounded-none border backdrop-blur-[12px] px-1.5 py-2 z-50"
            style={{ 
              backgroundColor: RAIL_STYLES[theme].bg,
              borderColor: RAIL_STYLES[theme].border,
              boxShadow: RAIL_STYLES[theme].shadow
            }}
          >
            {THEMES.map((t, i) => {
              const isActive = theme === t.id;
              return (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleSwitch(t.id)}
                  className={`relative flex items-center justify-center w-11 h-7 border font-mono text-[10px] transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "border-[var(--accent-primary)] text-[var(--text-primary)] bg-[var(--bg-hover)] shadow-[inset_0_0_8px_var(--bg-hover)]"
                      : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-primary)] hover:text-[var(--text-primary)]"
                  }`}
                  style={{
                    ...(theme === "light" && !isActive ? { backgroundColor: "rgba(0,0,0,0.02)" } : {})
                  }}
                >
                  {t.label}
                  {isActive && (
                    <span 
                      className="absolute -left-1 -top-1 w-1.5 h-1.5 bg-[var(--accent-primary)]"
                      style={{ boxShadow: "0 0 4px var(--accent-primary)" }}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
