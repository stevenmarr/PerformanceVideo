import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { publicHref } from "@/lib/preview-path-prefix";
import { authClient, authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!isPending && user) {
    void navigate({ to: "/" });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "up") {
        const result = await authClient.signUp.email({
          name: name.trim() || email.trim(),
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (result.error) throw new Error(result.error.message ?? "Could not create the account.");
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (result.error) throw new Error(result.error.message ?? "Could not sign in.");
      }
      window.location.href = publicHref("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-10 text-ink">
      <div className="w-full max-w-md">
        <Link to="/">
          <img src="/brand/wide-white.png" alt="Performance Video LLC" className="mb-8 h-16 w-auto" />
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Your library stays with this account.</p>
        {isPending ? <div className="mt-8 h-10 animate-pulse rounded-full bg-line" /> : null}
        {authEnabled && !user ? (
          <div className="mt-8 space-y-3">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                className="w-full rounded-full border border-line bg-panel px-4 py-3 text-sm font-semibold hover:bg-paper"
              >
                Continue with {provider.label}
              </button>
            ))}
            <form onSubmit={onSubmit} className="space-y-3 border-t border-line pt-4">
              {mode === "up" ? (
                <Field label="Name" value={name} onChange={setName} autoComplete="name" />
              ) : null}
              <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
              <Field
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
              />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper disabled:opacity-60"
              >
                {pending ? "Working…" : mode === "up" ? "Create account" : "Sign in with email"}
              </button>
              <button
                type="button"
                className="w-full text-sm text-muted underline underline-offset-4"
                onClick={() => setMode(mode === "up" ? "in" : "up")}
              >
                {mode === "up" ? "Already have an account" : "Create an email account"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        required
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none focus:border-ink"
      />
    </label>
  );
}
