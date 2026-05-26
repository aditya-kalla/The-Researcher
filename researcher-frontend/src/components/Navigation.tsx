import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/useStore";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function Navigation() {
  const { isAuthenticated, user } = useStore();
  const navigate = useNavigate();
  return (
    <nav className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-pixel-border bg-session-dark px-5">
      <Link to="/" className="font-pixel text-[12px] text-cream-terminal">
        ◆ THE RESEARCHER
      </Link>
      <div className="flex items-center gap-6">
        <ThemeSwitcher />
        <Link to="/" className="font-pixel text-[9px] text-mouse-gray hover:text-mono-white tracking-widest">
          HOME
        </Link>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="font-pixel text-[9px] text-mouse-gray hover:text-mono-white tracking-widest">
              DASHBOARD
            </Link>
            <Link to="/settings" className="font-pixel text-[9px] text-mouse-gray hover:text-mono-white tracking-widest">
              SETTINGS
            </Link>
            <span className="font-mono text-[12px] text-periwinkle-soft ml-2">{user?.username}</span>
            <button
              onClick={async () => {
                await signOut(auth);
                navigate({ to: '/' });
              }}
              className="font-pixel text-[9px] text-sakura-alert hover:underline tracking-widest"
            >
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
