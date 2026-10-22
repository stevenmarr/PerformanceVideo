import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  adminDrawing,
  adminHome,
  adminUser,
  type AdminDrawingView,
  type AdminHome,
  type AdminUserDetail,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [home, setHome] = useState<AdminHome | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [drawing, setDrawing] = useState<AdminDrawingView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    adminHome()
      .then((result) => {
        if (!cancelled) setHome(result);
      })
      .catch(() => {
        if (!cancelled) setError("The admin list could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function openUser(userId: string) {
    setError("");
    setDrawing(null);
    setDetail(null);
    try {
      const next = await adminUser({ data: userId });
      setDetail(next);
      if (!next) setError("That account was not found.");
    } catch {
      setError("That account could not be loaded.");
    }
  }

  async function openDrawing(userId: string, drawingId: number) {
    setError("");
    try {
      const next = await adminDrawing({ data: { userId, drawingId } });
      setDrawing(next);
      if (!next) setError("That drawing was not found.");
    } catch {
      setError("That drawing could not be loaded.");
    }
  }

  if (isPending || (user && !home && !error)) {
    return (
      <AppShell>
        <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <AppShell>
      <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Admin</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Every account</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Read only. Drawings and library changes stay with the person who made them.
      </p>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {home && !home.admin ? (
        <p className="mt-6 max-w-xl text-sm">
          Signed in as {user.displayName || "this account"}
          {user.primaryEmail ? ` (${user.primaryEmail})` : ""}. This page is for the Steven Marr account. To use a
          different email, set <span className="font-medium">ADMIN_EMAILS</span> on the server to that address.
        </p>
      ) : null}
      {home?.admin && !detail ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Drawings</th>
                <th className="py-2 pr-3 font-medium">Models</th>
                <th className="py-2 pr-3 font-medium">Systems</th>
                <th className="py-2 font-medium">Last drawing</th>
              </tr>
            </thead>
            <tbody>
              {home.users.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="py-2 pr-3">
                    <button type="button" className="font-semibold underline underline-offset-4" onClick={() => void openUser(row.id)}>
                      {row.name || "Untitled"}
                    </button>
                    {row.email.toLowerCase() === home.you?.email.toLowerCase() ? (
                      <span className="ml-2 text-xs text-muted">You</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-muted">{row.email}</td>
                  <td className="py-2 pr-3">{row.drawings}</td>
                  <td className="py-2 pr-3">{row.models}</td>
                  <td className="py-2 pr-3">{row.systems}</td>
                  <td className="py-2 text-muted">{row.lastDrawing ? row.lastDrawing.slice(0, 16) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {detail && !drawing ? (
        <section className="mt-6">
          <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setDetail(null)}>
            All accounts
          </button>
          <h2 className="mt-3 text-2xl font-semibold">{detail.user.name}</h2>
          <p className="mt-1 text-sm text-muted">{detail.user.email}</p>
          {detail.studio?.companyName ? (
            <p className="mt-2 text-sm">
              {detail.studio.companyName}
              {detail.studio.drawnBy ? ` · drawn by ${detail.studio.drawnBy}` : ""}
              {detail.studio.phone ? ` · ${detail.studio.phone}` : ""}
            </p>
          ) : null}
          <h3 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">Drawings</h3>
          {detail.drawings.length === 0 ? <p className="mt-2 text-sm">No drawings.</p> : null}
          <ul className="mt-2 divide-y divide-line">
            {detail.drawings.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <button
                  type="button"
                  className="text-left font-semibold underline underline-offset-4"
                  onClick={() => void openDrawing(detail.user.id, item.id)}
                >
                  {item.name}
                </button>
                <span className="text-xs text-muted">
                  {item.nodes} boxes · {item.edges} cables
                  {item.templateKey ? ` · ${item.templateKey}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">Library</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Manufacturer</th>
                  <th className="py-2 pr-3 font-medium">Model</th>
                  <th className="py-2 pr-3 font-medium">Kind</th>
                  <th className="py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {detail.models.map((item) => (
                  <tr key={item.id} className="border-b border-line">
                    <td className="py-2 pr-3">{item.deviceType}</td>
                    <td className="py-2 pr-3">{item.manufacturer}</td>
                    <td className="py-2 pr-3 font-medium">{item.model}</td>
                    <td className="py-2 pr-3 text-muted">{item.kind}</td>
                    <td className="py-2 text-muted">{item.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {detail && drawing ? (
        <section className="mt-6">
          <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setDrawing(null)}>
            {detail.user.name}
          </button>
          <h2 className="mt-3 text-2xl font-semibold">{drawing.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {[drawing.title.event, drawing.title.location, drawing.title.date, drawing.title.drawnBy].filter(Boolean).join(" · ")}
          </p>
          <h3 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">Gear</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="py-2 pr-3 font-medium">Unit</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Manufacturer</th>
                  <th className="py-2 pr-3 font-medium">Model</th>
                  <th className="py-2 pr-3 font-medium">IP</th>
                  <th className="py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {drawing.nodes.map((node, index) => (
                  <tr key={`${node.unitId}-${index}`} className="border-b border-line">
                    <td className="py-2 pr-3 font-medium">{node.unitId}</td>
                    <td className="py-2 pr-3">{node.deviceType}</td>
                    <td className="py-2 pr-3">{node.manufacturer}</td>
                    <td className="py-2 pr-3">{node.model}</td>
                    <td className="py-2 pr-3 text-muted">{node.ip}</td>
                    <td className="py-2 text-muted">{node.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">Cables</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="py-2 pr-3 font-medium">From</th>
                  <th className="py-2 pr-3 font-medium">Jack</th>
                  <th className="py-2 pr-3 font-medium">Signal</th>
                  <th className="py-2 pr-3 font-medium">To</th>
                  <th className="py-2 pr-3 font-medium">Jack</th>
                  <th className="py-2 font-medium">Cable</th>
                </tr>
              </thead>
              <tbody>
                {drawing.cables.map((cable, index) => (
                  <tr key={`${cable.fromUnit}-${cable.toUnit}-${index}`} className="border-b border-line">
                    <td className="py-2 pr-3 font-medium">{cable.fromUnit}</td>
                    <td className="py-2 pr-3">{cable.fromJack}</td>
                    <td className="py-2 pr-3">{cable.signal}</td>
                    <td className="py-2 pr-3 font-medium">{cable.toUnit}</td>
                    <td className="py-2 pr-3">{cable.toJack}</td>
                    <td className="py-2 text-muted">{cable.cable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
