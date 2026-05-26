import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface RetroWindowProps {
  title: string;
  children: ReactNode;
  variant?: "default" | "terminal" | "alert" | "accent" | "cream";
  titleBarColor?: string;
  titleTextColor?: string;
  borderColor?: string;
  icon?: ReactNode;
  onClose?: () => void;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  hoverShadow?: boolean;
}

const VARIANT_STYLES: Record<
  NonNullable<RetroWindowProps["variant"]>,
  { titleBar: string; body: string; border: string; titleText: string }
> = {
  default: { titleBar: "bg-white/[0.04]", body: "bg-session-dark", border: "border-pixel-border", titleText: "text-mono-white" },
  terminal: { titleBar: "bg-black", body: "bg-black", border: "border-pixel-border", titleText: "text-lime-signal" },
  alert: { titleBar: "bg-sakura-alert/15", body: "bg-session-dark", border: "border-sakura-alert", titleText: "text-sakura-alert" },
  accent: { titleBar: "bg-electric-accent/20", body: "bg-session-dark", border: "border-electric-accent", titleText: "text-mono-white" },
  cream: { titleBar: "bg-cream-terminal", body: "bg-cream-terminal", border: "border-research-navy", titleText: "text-research-navy" },
};

export function RetroWindow({
  title,
  children,
  variant = "default",
  titleBarColor,
  titleTextColor,
  borderColor,
  icon,
  onClose,
  className = "",
  collapsible = false,
  defaultCollapsed = false,
  hoverShadow = true,
}: RetroWindowProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const v = VARIANT_STYLES[variant];

  return (
    <div
      className={`group relative border ${v.border} ${className} transition-shadow duration-100 ${
        hoverShadow ? "hover:shadow-[2px_2px_0_0_var(--accent-primary)]" : ""
      }`}
      style={borderColor ? { borderColor } : undefined}
    >
      {/* Title bar */}
      <div
        className={`flex h-8 items-center gap-2 border-b ${v.border} px-2 ${v.titleBar} ${
          collapsible ? "cursor-pointer" : ""
        }`}
        style={{
          ...(titleBarColor ? { backgroundColor: titleBarColor } : {}),
          ...(borderColor ? { borderColor } : {}),
        }}
        onClick={() => collapsible && setCollapsed((c) => !c)}
      >
        <div className="flex items-center" style={{ gap: 6 }}>
          <WindowDot color="#FFBD2E" symbol="─" title="minimize" />
          <WindowDot color="#28C940" symbol="□" title="maximize" />
          <WindowDot
            color="#FF5F57"
            symbol="✕"
            title="close"
            onClick={onClose ? (e) => { e.stopPropagation(); onClose(); } : undefined}
          />
        </div>
        <div
          className={`font-pixel flex-1 truncate text-center text-[9px] ${v.titleText}`}
          style={titleTextColor ? { color: titleTextColor } : undefined}
        >
          {title}
        </div>
        <div className="flex w-[40px] items-center justify-end gap-1">
          {icon}
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`overflow-hidden ${v.body}`}
          >
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WindowDot({
  color,
  symbol,
  title,
  onClick,
}: {
  color: string;
  symbol: string;
  title: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center justify-center border border-black transition-transform hover:scale-110 hover:brightness-125"
      style={{
        width: 10,
        height: 10,
        backgroundColor: color,
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 6,
        lineHeight: 1,
        color: "#000",
        padding: 0,
      }}
    >
      <span style={{ display: "block", marginTop: -1 }}>{symbol}</span>
    </button>
  );
}

