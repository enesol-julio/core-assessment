"use client";
import { useState } from "react";

type Domain = { domain: string; added_by: string; added_at: string };

export default function DomainsSettings({ initialDomains }: { initialDomains: Domain[] }) {
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(ev: React.FormEvent) {
    ev.preventDefault();
    if (!newDomain.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const body = await r.json();
      if (!r.ok) {
        setError(body.error ?? "Failed to add");
        return;
      }
      setDomains((prev) => [...prev, body].sort((a, b) => a.domain.localeCompare(b.domain)));
      setNewDomain("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(domain: string) {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/domains/${encodeURIComponent(domain)}`, {
        method: "DELETE",
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Failed to remove");
        return;
      }
      setDomains((prev) => prev.filter((d) => d.domain !== domain));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded border border-zinc-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold">Allowed email domains</h2>
      <form onSubmit={add} className="mb-4 flex items-center gap-2">
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" disabled={busy} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          Add
        </button>
      </form>
      {error ? <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}
      <ul className="divide-y divide-zinc-100">
        {domains.map((d) => (
          <li key={d.domain} className="flex items-center justify-between py-2">
            <span className="font-mono">{d.domain}</span>
            <span className="flex items-center gap-3 text-xs text-zinc-500">
              <span>added by {d.added_by}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(d.domain)}
                className="rounded border px-2 py-1 text-zinc-700 hover:bg-zinc-50"
              >
                remove
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
