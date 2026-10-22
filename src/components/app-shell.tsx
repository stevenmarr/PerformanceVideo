import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { adminProbe } from "@/lib/admin.functions";

const links = [
  { to: "/", label: "Studio" },
  { to: "/library", label: "Library" },
  { to: "/draw", label: "Drawing" },
  { to: "/company", label: "Title block" },
] as const;

export function AppShell({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [admin, setAdmin] = useState(false);
  const nav = admin ? [...links, { to: "/admin" as const, label: "Admin" }] : links;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    adminProbe()
      .then((result) => {
        if (!cancelled) setAdmin(result.admin);
      })
      .catch(() => {
        if (!cancelled) setAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    function onContext(event: MouseEvent) {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      const left = Math.max(8, Math.min(event.clientX, window.innerWidth - 220));
      const top = Math.max(8, Math.min(event.clientY, window.innerHeight - 220));
      setMenu({ x: left, y: top });
    }
    function onPointer() {
      setMenu(null);
    }
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("click", onPointer);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("click", onPointer);
    };
  }, []);

  return (
    <div className={bleed ? "flex h-dvh flex-col overflow-hidden bg-paper text-ink" : "flex min-h-screen flex-col bg-paper text-ink"}>
      <header className="sticky top-0 z-40 shrink-0 border-b border-line bg-panel">
        <div className="flex items-center gap-2 px-3 py-2">
          <Link to="/" className="flex shrink-0 items-center">
            <img
              src="/brand/wide-white.png"
              alt="Performance Video LLC"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <nav className="flex shrink-0 items-center gap-1">
            {nav.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-paper hover:text-ink"
                activeProps={{ className: "rounded-full px-3 py-2 text-sm font-semibold text-ink bg-paper" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div id="shell-commands" className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto" />
          <div className="flex h-10 shrink-0 items-center">
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-line" />
            ) : user ? (
              <UserButton />
            ) : (
              <Link to="/login" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main
        className={
          bleed
            ? "flex min-h-0 flex-1 flex-col"
            : "mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"
        }
      >
        {children}
      </main>
      {menu ? (
        <div
          className="fixed z-50 w-52 rounded-xl border border-line bg-panel p-2 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="px-2 py-1 text-xs font-semibold tracking-[0.14em] text-muted uppercase">Performance Video</p>
          {nav.map((link) => (
            <button
              key={link.to}
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-paper"
              onClick={() => {
                setMenu(null);
                void navigate({ to: link.to });
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
