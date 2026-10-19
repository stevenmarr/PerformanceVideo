import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getCatalog, saveStudio, type StudioRow } from "@/lib/catalog.functions";

export const Route = createFileRoute("/company")({ component: CompanyPage });

const empty: StudioRow = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  tagline: "",
  drawnBy: "",
};

function CompanyPage() {
  const { user, isPending } = useCurrentUserState();
  const [form, setForm] = useState<StudioRow>(empty);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getCatalog()
      .then((catalog) => {
        if (!cancelled) setForm(catalog.studio);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the title block.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isPending) return <AppShell><div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line" /></AppShell>;
  if (!user) return <RedirectToSignIn />;

  function set<K extends keyof StudioRow>(key: K, value: StudioRow[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    setError("");
    const result = await saveStudio({ data: form });
    if (result.error) setError(result.error);
    else setStatus("Saved. This is the company on the drawing, not the Performance Video mark.");
  }

  return (
    <AppShell>
      <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Title block</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your company on the drawing</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Performance Video stays on the software. These fields are the event sheet header: company, contact, and who drew it.
      </p>
      <form onSubmit={onSubmit} className="mt-8 grid max-w-xl gap-4">
        <Field label="Company name" value={form.companyName} onChange={(value) => set("companyName", value)} />
        <Field label="Address" value={form.address} onChange={(value) => set("address", value)} />
        <Field label="Phone" value={form.phone} onChange={(value) => set("phone", value)} />
        <Field label="Email" value={form.email} onChange={(value) => set("email", value)} />
        <Field label="Website" value={form.website} onChange={(value) => set("website", value)} />
        <Field label="Tagline" value={form.tagline} onChange={(value) => set("tagline", value)} />
        <Field label="Drawn by" value={form.drawnBy} onChange={(value) => set("drawnBy", value)} />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {status ? <p className="text-sm">{status}</p> : null}
        <button type="submit" className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">
          Save title block
        </button>
      </form>
    </AppShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none focus:border-ink"
      />
    </label>
  );
}
