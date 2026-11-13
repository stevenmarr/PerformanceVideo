import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DatabasePanel } from "@/components/admin/database-panel";
import { DevicesPanel } from "@/components/admin/devices-panel";
import { UsersPanel } from "@/components/admin/users-panel";
import { adminProbe } from "@/lib/admin.functions";
import { adminAudit } from "@/lib/admin/manage.functions";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Tab = "users" | "devices" | "database" | "audit";

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("users");
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof adminAudit>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    void adminProbe()
      .then((result) => setAdmin(result.admin))
      .catch(() => setError("Admin access could not be checked."));
  }, [user?.id]);

  useEffect(() => {
    if (tab !== "audit" || !admin) return;
    void adminAudit()
      .then(setAudit)
      .catch(() => setError("The audit log could not be loaded."));
  }, [tab, admin]);

  if (isPending || (user && admin == null && !error)) {
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
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Studio control</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Accounts, device definitions, and the database. Every change is written to the audit log. The security model is in the
        admin security note shipped with the app.
      </p>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {admin === false ? (
        <p className="mt-6 max-w-xl text-sm">
          Signed in as {user.displayName || "this account"}. This page is limited to admin accounts.
        </p>
      ) : null}
      {admin ? (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(
              [
                ["users", "Accounts"],
                ["devices", "Devices"],
                ["database", "Database"],
                ["audit", "Audit"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === id ? "bg-ink text-paper" : "border border-line"}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "users" ? <UsersPanel you={user.primaryEmail || ""} /> : null}
          {tab === "devices" ? <DevicesPanel /> : null}
          {tab === "database" ? <DatabasePanel /> : null}
          {tab === "audit" ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Who</th>
                    <th className="py-2 pr-3 font-medium">Action</th>
                    <th className="py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit?.rows ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-line">
                      <td className="py-2 pr-3 text-muted">{row.createdAt.slice(0, 19)}</td>
                      <td className="py-2 pr-3">{row.actorEmail || row.actorId}</td>
                      <td className="py-2 pr-3">{row.action}</td>
                      <td className="py-2">{row.detail || `${row.targetType} ${row.targetId}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}
