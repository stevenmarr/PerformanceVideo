import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { accountStatus } from "@/lib/auth/account.functions";
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [admin, setAdmin] = useState(false);
  const nav = admin ? [...links, { to: "/admin" as const, label: "Admin" }] : links;
  const headerRef = useRef<HTMLElement>(null);

  // Publish the header's real height (it grows when the toolbar wraps) so
  // fixed popovers can keep clear of it. Panels sit below it through layout.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--app-header-h", `${Math.ceil(header.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--app-header-h");
    };
  }, []);

  useEffect(() => {
    if (!user?.id || pathname === "/account") return;
    let cancelled = false;
    accountStatus()
      .then((status) => {
        if (!cancelled && status.mustChangePassword) void navigate({ to: "/account" });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.id, pathname, navigate]);

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
      <header ref={headerRef} className="sticky top-0 z-40 shrink-0 border-b border-line bg-panel">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
          <Link to="/" aria-label="Performance Video LLC home" className="brand-logo flex shrink-0 items-center rounded-lg">
            <img
              src="/brand/wide-white.png"
              alt="Performance Video LLC"
              width={1711}
              height={776}
              className="brand-logo-on-dark h-12 w-auto -my-1 object-contain"
            />
            <img
              src="/brand/wide-black.png"
              alt=""
              aria-hidden="true"
              width={1711}
              height={776}
              className="brand-logo-on-light h-12 w-auto -my-1 object-contain"
            />
          </Link>
          <nav className="flex shrink-0 flex-wrap items-center gap-1">
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
          <div className="ml-auto flex h-10 shrink-0 items-center 2xl:order-last 2xl:ml-0">
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-line" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <Link to="/account" className="rounded-full px-3 py-2 text-sm text-muted hover:text-ink">
                  Password
                </Link>
                <UserButton />
              </div>
            ) : (
              <Link to="/login" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">
                Sign in
              </Link>
            )}
          </div>
          {/* Page toolbar. Below 2xl it takes its own row and wraps instead of
              scrolling under the nav; at 2xl it sits inline before the user. */}
          <div
            id="shell-commands"
            className="flex w-full min-w-0 flex-wrap items-center gap-2 empty:hidden 2xl:w-auto 2xl:flex-1 2xl:justify-end"
          />
        </div>
      </header>
      <main
        className={
          bleed
            ? "relative flex min-h-0 flex-1 flex-col"
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
