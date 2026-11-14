import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { accountStatus, changeEmail, changePassword } from "@/lib/auth/account.functions";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [forced, setForced] = useState(false);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    void accountStatus().then((status) => {
      setForced(status.mustChangePassword);
      setEmail(status.email);
    });
  }, [user?.id]);

  if (isPending) {
    return (
      <AppShell>
        <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <AppShell>
      <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{forced ? "Choose a new password" : "Password and email"}</h1>
      {forced ? (
        <p className="mt-2 max-w-xl text-sm">
          This password was set for you. Pick a new one before opening drawings.
        </p>
      ) : (
        <p className="mt-2 max-w-xl text-sm text-muted">Signed in as {email || user.primaryEmail}.</p>
      )}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {note ? <p className="mt-4 text-sm">{note}</p> : null}
      <form
        className="mt-6 max-w-md space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          setNote("");
          if (newPassword !== confirm) {
            setError("Those passwords do not match.");
            return;
          }
          void changePassword({ data: { currentPassword, newPassword } }).then((result) => {
            if (!result.ok) {
              setError(result.error ?? "The password could not be changed.");
              return;
            }
            setForced(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirm("");
            setNote("Password updated.");
            if (forced) void navigate({ to: "/" });
          });
        }}
      >
        <label className="block text-sm">
          Current password
          <input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none" />
        </label>
        <label className="block text-sm">
          New password
          <input type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none" />
        </label>
        <label className="block text-sm">
          Confirm new password
          <input type="password" required minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none" />
        </label>
        <button type="submit" className="rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper">
          Save password
        </button>
      </form>
      {!forced ? (
        <form
          className="mt-10 max-w-md space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            void changeEmail({ data: { email, currentPassword: emailPassword } }).then((result) => {
              if (!result.ok) setError(result.error ?? "The email could not be changed.");
              else setNote("Email updated.");
            });
          }}
        >
          <h2 className="text-lg font-semibold">Email</h2>
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-line bg-panel px-3 py-3 text-sm outline-none" />
          <input type="password" required value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} placeholder="Current password" className="w-full rounded-xl border border-line bg-panel px-3 py-3 text-sm outline-none" />
          <button type="submit" className="rounded-full border border-line px-4 py-3 text-sm font-semibold">
            Save email
          </button>
        </form>
      ) : null}
    </AppShell>
  );
}
