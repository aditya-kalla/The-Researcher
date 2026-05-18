import { Link } from "@tanstack/react-router";
import { useStore } from "@/store/useStore";

export function Navigation() {
  const { isAuthenticated, user, logout } = useStore();
  return (
    <nav className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-pixel-border bg-session-dark px-4">
      <Link to="/" className="font-pixel text-[11px] text-cream-terminal">
        ◆ THE RESEARCHER
      </Link>
      <div className="flex items-center gap-5">
        <Link to="/" className="font-pixel text-[8px] text-mouse-gray hover:text-mono-white">
          HOME
        </Link>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="font-pixel text-[8px] text-mouse-gray hover:text-mono-white">
              DASHBOARD
            </Link>
            <Link to="/settings" className="font-pixel text-[8px] text-mouse-gray hover:text-mono-white">
              SETTINGS
            </Link>
            <span className="font-mono text-[11px] text-periwinkle-soft">{user?.username}</span>
            <button onClick={logout} className="font-pixel text-[8px] text-sakura-alert hover:underline">
              LOGOUT
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className="border-2 border-black bg-electric-accent px-3 py-1.5 font-pixel text-[9px] text-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all"
          >
            ▶ SIGN IN
          </Link>
        )}
      </div>
    </nav>
  );
}
