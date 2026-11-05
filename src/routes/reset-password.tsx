import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { publicHref } from "@/lib/preview-path-prefix";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    error: typeof search.error === "string" ? search.error : "",
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token, error: linkError } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message ?? "That link is no longer valid.");
      window.location.href = publicHref("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-10 text-ink">
      <div className="w-full max-w-md">
        <Link to="/">
          <img src="/brand/wide-white.png" alt="Performance Video LLC" className="mb-8 h-16 w-auto" />
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
        {linkError || !token ? (
          <p className="mt-4 text-sm">
            This reset link is missing or expired.{" "}
            <button type="button" className="underline underline-offset-4" onClick={() => void navigate({ to: "/login" })}>
              Request another
            </button>
            .
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <label className="block text-sm">
              <span className="font-medium">New password</span>
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none focus:border-ink"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Confirm password</span>
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none focus:border-ink"
              />
            </label>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper disabled:opacity-60"
            >
              {pending ? "Working…" : "Save password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
