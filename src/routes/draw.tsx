import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { AppShell } from "@/components/app-shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getCatalog, type Catalog } from "@/lib/catalog.functions";
import { emptyDrawing, type DrawingFile } from "@/lib/drawing";
import {
  deleteDrawing,
  getDrawing,
  listDrawings,
  saveDrawing,
  type DrawingSummary,
} from "@/lib/drawing.functions";

export const Route = createFileRoute("/draw")({ component: DrawPage });

type CanvasProps = {
  catalog: Catalog;
  drawing: { id: number | null; name: string; graph: DrawingFile };
  drawings: DrawingSummary[];
  onOpen: (id: number) => void;
  onSave: (payload: { id: number | null; name: string; graph: DrawingFile }) => Promise<{ id: number | null; error: string | null }>;
  onCreate: () => void;
  onDelete: (id: number) => Promise<void>;
  onLibraryChange: () => Promise<void>;
};

function DrawPage() {
  const { user, isPending } = useCurrentUserState();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [drawings, setDrawings] = useState<DrawingSummary[]>([]);
  const [drawing, setDrawing] = useState<{ id: number | null; name: string; graph: DrawingFile } | null>(null);
  const [session, setSession] = useState(0);
  const [Canvas, setCanvas] = useState<ComponentType<CanvasProps> | null>(null);
  const [error, setError] = useState("");

  async function refreshCatalog() {
    const next = await getCatalog();
    setCatalog(next);
  }

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    Promise.all([getCatalog(), listDrawings()])
      .then(async ([library, list]) => {
        if (cancelled) return;
        setCatalog(library);
        setDrawings(list);
        const preferred = list.find((item) => item.templateKey === "jpm") ?? list.find((item) => item.templateKey === "solventum") ?? list[0];
        if (!preferred) {
          setDrawing({ id: null, name: "Untitled show", graph: emptyDrawing() });
          return;
        }
        const opened = await getDrawing({ data: preferred.id });
        if (cancelled) return;
        setDrawing(
          opened
            ? { id: opened.id, name: opened.name, graph: opened.graph }
            : { id: null, name: "Untitled show", graph: emptyDrawing() },
        );
      })
      .catch(() => {
        if (!cancelled) setError("The drawing could not be loaded.");
      });
    void import("@/components/flow-canvas").then((mod) => {
      if (!cancelled) setCanvas(() => mod.FlowCanvas);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function openDrawing(id: number) {
    const opened = await getDrawing({ data: id });
    if (!opened) return;
    setDrawing({ id: opened.id, name: opened.name, graph: opened.graph });
    setSession((current) => current + 1);
  }

  if (isPending) {
    return (
      <AppShell>
        <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <AppShell bleed>
      {error ? <p className="px-4 py-3 text-sm text-danger">{error}</p> : null}
      {catalog && drawing && Canvas ? (
        <Canvas
          key={session}
          catalog={catalog}
          drawing={drawing}
          drawings={drawings}
          onOpen={(id) => void openDrawing(id)}
          onSave={async (payload) => {
            const result = await saveDrawing({ data: payload });
            if (result.id) {
              const list = await listDrawings();
              setDrawings(list);
            }
            return result;
          }}
          onCreate={() => {
            setDrawing({ id: null, name: "Untitled show", graph: emptyDrawing() });
            setSession((current) => current + 1);
          }}
          onDelete={async (id) => {
            await deleteDrawing({ data: id });
            const list = await listDrawings();
            setDrawings(list);
            const next = list.find((item) => item.templateKey === "jpm") ?? list.find((item) => item.templateKey === "solventum") ?? list[0];
            if (!next) {
              setDrawing({ id: null, name: "Untitled show", graph: emptyDrawing() });
              setSession((current) => current + 1);
              return;
            }
            const opened = await getDrawing({ data: next.id });
            setDrawing(
              opened
                ? { id: opened.id, name: opened.name, graph: opened.graph }
                : { id: null, name: "Untitled show", graph: emptyDrawing() },
            );
            setSession((current) => current + 1);
          }}
          onLibraryChange={refreshCatalog}
        />
      ) : (
        <div className="m-4 h-[70vh] animate-pulse rounded-[var(--radius-card)] bg-line" />
      )}
    </AppShell>
  );
}
