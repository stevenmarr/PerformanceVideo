import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { studioOwnerLocked } from "@/lib/admin/studio-owner";
import { toCsv } from "@/lib/admin/table-query";
import { adminHome, adminSetPassword, adminUser, type AdminHome, type AdminUserDetail } from "@/lib/admin.functions";
import {
  adminDeleteEquipment,
  adminDeleteUser,
  adminSaveEquipment,
  adminSendReset,
  adminSetDisabled,
  adminSetRole,
} from "@/lib/admin/manage.functions";

export function UsersPanel({ you }: { you: string }) {
  const [search, setSearch] = useState("");
  const [home, setHome] = useState<AdminHome | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [password, setPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [model, setModel] = useState({ deviceType: "", manufacturer: "", model: "", notes: "", pinsJson: "[]" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function refresh(query = search) {
    const next = await adminHome({ data: query });
    setHome(next);
    return next;
  }

  useEffect(() => {
    void refresh("").catch(() => setError("The account list could not be loaded."));
  }, []);

  async function openUser(userId: string) {
    setError("");
    setNote("");
    setConfirmDelete("");
    const next = await adminUser({ data: userId });
    setDetail(next);
  }

  if (!home?.admin) return <p className="mt-6 text-sm">This account is not an admin.</p>;

  return (
    <div className="mt-6">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void refresh().catch(() => setError("The search failed."));
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, or username"
          className="w-full max-w-md rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none"
        />
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">
          Search
        </button>
        <button
          type="button"
          className="rounded-full border border-line px-4 py-2 text-sm"
          onClick={() => {
            const csv = toCsv(
              ["name", "email", "username", "role", "drawings", "status"],
              home.users.map((row) => ({
                name: row.name,
                email: row.email,
                username: row.username,
                role: row.role,
                drawings: String(row.drawings),
                status: row.disabled ? "disabled" : "active",
              })),
            );
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "accounts.csv";
            anchor.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export accounts
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {note ? <p className="mt-3 text-sm">{note}</p> : null}
      {!detail ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Drawings</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {home.users.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="py-2 pr-3">
                    <button type="button" className="font-semibold underline underline-offset-4" onClick={() => void openUser(row.id)}>
                      {row.name || "Untitled"}
                    </button>
                    {row.username ? <span className="ml-2 text-xs text-muted">{row.username}</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-muted">{row.email}</td>
                  <td className="py-2 pr-3">{row.role}</td>
                  <td className="py-2 pr-3">{row.drawings}</td>
                  <td className="py-2">{row.disabled ? "Disabled" : "Active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="mt-6 space-y-6">
          <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setDetail(null)}>
            All accounts
          </button>
          <div>
            <h2 className="text-2xl font-semibold">{detail.user.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {detail.user.email}
              {detail.user.email.toLowerCase() === you.toLowerCase() ? " · You" : ""}
            </p>
          </div>
          {studioOwnerLocked(detail.user.username) ? (
            <p className="text-sm">{studioOwnerLocked(detail.user.username)}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-line px-4 py-2 text-sm"
              onClick={() =>
                void adminSetRole({ data: { userId: detail.user.id, role: "admin" } }).then((result) => {
                  setError(result.error ?? "");
                  if (!result.error) setNote("Role set to admin.");
                })
              }
            >
              Make admin
            </button>
            {studioOwnerLocked(detail.user.username) ? null : (
              <button
                type="button"
                className="rounded-full border border-line px-4 py-2 text-sm"
                onClick={() =>
                  void adminSetRole({ data: { userId: detail.user.id, role: "user" } }).then((result) => {
                    setError(result.error ?? "");
                    if (!result.error) setNote("Role set to user.");
                  })
                }
              >
                Make user
              </button>
            )}
            {studioOwnerLocked(detail.user.username) ? null : (
              <button
                type="button"
                className="rounded-full border border-line px-4 py-2 text-sm"
                onClick={() =>
                  void adminSetDisabled({ data: { userId: detail.user.id, disabled: true } }).then((result) => {
                    setError(result.error ?? "");
                    if (!result.error) setNote("Account disabled and signed out.");
                  })
                }
              >
                Disable
              </button>
            )}
            <button
              type="button"
              className="rounded-full border border-line px-4 py-2 text-sm"
              onClick={() =>
                void adminSetDisabled({ data: { userId: detail.user.id, disabled: false } }).then((result) => {
                  setError(result.error ?? "");
                  if (!result.error) setNote("Account enabled.");
                })
              }
            >
              Enable
            </button>
            <button
              type="button"
              className="rounded-full border border-line px-4 py-2 text-sm"
              onClick={() =>
                void adminSendReset({ data: detail.user.id }).then((result) => {
                  setError(result.error ?? "");
                  if (!result.error) setNote("Password reset email queued.");
                })
              }
            >
              Email password reset
            </button>
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void adminSetPassword({ data: { userId: detail.user.id, password } }).then((result) => {
                setError(result.error ?? "");
                if (!result.error) {
                  setPassword("");
                  setNote("Temporary password set. They must change it on next sign-in.");
                }
              });
            }}
          >
            <label className="text-sm">
              Temporary password
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 block rounded-xl border border-line bg-panel px-3 py-2"
              />
            </label>
            <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">
              Set password
            </button>
          </form>
          <div>
            <h3 className="text-lg font-semibold">Drawings</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {detail.drawings.map((drawing) => (
                <li key={drawing.id} className="flex flex-wrap items-center gap-3">
                  <span>
                    {drawing.name} · {drawing.nodes} boxes · {drawing.edges} cables
                  </span>
                  <Link to="/draw" search={{ owner: detail.user.id, drawing: drawing.id, mode: "view" }} className="underline underline-offset-4">
                    View
                  </Link>
                  <Link to="/draw" search={{ owner: detail.user.id, drawing: drawing.id, mode: "edit" }} className="underline underline-offset-4">
                    Edit
                  </Link>
                </li>
              ))}
              {!detail.drawings.length ? <li className="text-muted">No drawings.</li> : null}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Library models</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {detail.models.map((item) => (
                <li key={item.id}>
                  {item.manufacturer} {item.model} <span className="text-muted">{item.deviceType}</span>
                </li>
              ))}
              {!detail.models.length ? <li className="text-muted">No models.</li> : null}
            </ul>
            <form
              className="mt-4 grid gap-2 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void adminSaveEquipment({ data: { userId: detail.user.id, id: 0, ...model } }).then(async (result) => {
                  setError(result.error ?? "");
                  if (!result.error) {
                    setNote("Model saved.");
                    await openUser(detail.user.id);
                  }
                });
              }}
            >
              <input placeholder="Device type" value={model.deviceType} onChange={(event) => setModel({ ...model, deviceType: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
              <input placeholder="Manufacturer" value={model.manufacturer} onChange={(event) => setModel({ ...model, manufacturer: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
              <input placeholder="Model" value={model.model} onChange={(event) => setModel({ ...model, model: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
              <input placeholder="Notes" value={model.notes} onChange={(event) => setModel({ ...model, notes: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
              <textarea value={model.pinsJson} onChange={(event) => setModel({ ...model, pinsJson: event.target.value })} className="min-h-20 rounded-xl border border-line bg-panel px-3 py-2 font-mono text-xs sm:col-span-2" />
              <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper sm:col-span-2">
                Add model
              </button>
            </form>
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const id = Number((event.currentTarget.elements.namedItem("modelId") as HTMLInputElement).value);
                void adminDeleteEquipment({ data: { userId: detail.user.id, id, confirm: "DELETE MODEL" } }).then(async (result) => {
                  setError(result.error ?? "");
                  if (!result.error) await openUser(detail.user.id);
                });
              }}
            >
              <input name="modelId" type="number" placeholder="Model id" className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
              <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm text-danger">
                Delete model
              </button>
            </form>
          </div>
          {studioOwnerLocked(detail.user.username) ? null : (
          <form
            className="rounded-2xl border border-line p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void adminDeleteUser({ data: { userId: detail.user.id, confirm: confirmDelete } }).then((result) => {
                setError(result.error ?? "");
                if (!result.error) {
                  setDetail(null);
                  setNote("Account deleted.");
                  void refresh();
                }
              });
            }}
          >
            <p className="text-sm font-semibold">Delete account</p>
            <p className="mt-1 text-sm text-muted">Type {detail.user.email} to delete the account and its drawings.</p>
            <input value={confirmDelete} onChange={(event) => setConfirmDelete(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
            <button type="submit" className="mt-2 rounded-full border border-line px-4 py-2 text-sm text-danger">
              Delete account
            </button>
          </form>
          )}
        </section>
      )}
    </div>
  );
}
