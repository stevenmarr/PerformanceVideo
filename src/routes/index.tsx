import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { getCatalog, type Catalog } from "@/lib/catalog.functions";
import { listDrawings } from "@/lib/drawing.functions";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Performance Video LLC</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Draw the show from the library.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Place a saved model, then cable an output to an input it can lock. A 3G-SDI output can land on a
            12G-SDI input. HDMI still does not land on SDI. A converter is its own box.
          </p>
          <SignedOut>
            <Link to="/login" className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">
              Sign in to your library
            </Link>
          </SignedOut>
          <SignedIn>
            <StudioCounts />
          </SignedIn>
        </div>
        <Rules />
      </section>
    </AppShell>
  );
}

function StudioCounts() {
  const user = useCurrentUser();
  const { isPending } = useCurrentUserState();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [drawings, setDrawings] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    Promise.all([getCatalog(), listDrawings()])
      .then(([data, list]) => {
        if (cancelled) return;
        setCatalog(data);
        setDrawings(list.length);
      })
      .catch(() => {
        if (!cancelled) setError("The library could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isPending) return null;

  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm text-muted">
        {user?.displayName ? `${user.displayName}, Solventum` : "Solventum"} is already saved as a drawing. Open it,
        edit the unit IDs, and export a patch or a pull list.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Count label="Signals" value={catalog?.connectionTypes.length} />
        <Count label="Equipment models" value={catalog?.equipment.length} />
        <Count label="Drawings" value={drawings ?? undefined} />
      </div>
      <div className="flex flex-wrap gap-4">
        <Link to="/draw" className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">
          Open Solventum
        </Link>
        <Link to="/library" className="inline-flex py-3 text-sm font-semibold underline underline-offset-4">
          Open the library
        </Link>
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-panel p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value ?? "–"}</p>
    </div>
  );
}

function Rules() {
  const rules = [
    ["Same signal, both ends", "HDMI only lands on HDMI. SDI only lands on SDI. A slower SDI rate can land on a faster SDI connection."],
    ["Every adapter is a box", "Converters, splitters, and distribution amps are equipment. They are not a note on a line."],
    ["Patch and pull list", "The drawing exports a patch by unit ID, and a pull list such as 5 MD-LX. A saved system counts as one."],
  ];
  return (
    <ul className="space-y-4">
      {rules.map(([title, body]) => (
        <li key={title} className="border-t border-line pt-4">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted">{body}</p>
        </li>
      ))}
    </ul>
  );
}
