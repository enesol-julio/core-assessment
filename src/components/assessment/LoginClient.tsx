"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { lookupString } from "@/lib/content/strings-client";
import type { StringsMap } from "@/lib/content/strings-client";

type Props = {
  initialLanguage: "en" | "es";
  initialStrings: StringsMap;
  fallbackStrings: StringsMap;
  seedDomains: string[];
};

export default function LoginClient({
  initialLanguage,
  initialStrings,
  fallbackStrings,
  seedDomains,
}: Props) {
  const router = useRouter();
  const [language, setLanguage] = useState<"en" | "es">(initialLanguage);
  const [strings, setStrings] = useState<StringsMap>(initialStrings);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function t(key: string): string {
    return lookupString(strings, key, fallbackStrings);
  }

  useEffect(() => {
    if (language === initialLanguage) return;
    let cancelled = false;
    fetch(`/api/content/ui-strings?lang=${language}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setStrings(body.strings);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [language, initialLanguage]);

  async function requestOtp(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), language }),
      });
      const body = await r.json();
      if (!r.ok) {
        setError(body.error ?? "Unable to send code");
        return;
      }
      setStatus(t("auth.otp_sent"));
      setStage("verify");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          name: name.trim() || undefined,
          role: role.trim() || undefined,
          language,
        }),
      });
      const body = await r.json();
      if (!r.ok) {
        setError(body.error ?? t("auth.otp_invalid"));
        return;
      }
      router.push("/assess");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">CORE</h1>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`rounded px-2 py-1 ${language === "en" ? "bg-zinc-900 text-white" : "border"}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage("es")}
            className={`rounded px-2 py-1 ${language === "es" ? "bg-zinc-900 text-white" : "border"}`}
          >
            ES
          </button>
        </div>
      </header>

      {stage === "request" ? (
        <form onSubmit={requestOtp} className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="email">
            {t("auth.email_label")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.email_placeholder")}
            className="w-full rounded border px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-zinc-900 py-2 text-white disabled:opacity-50"
          >
            {loading ? "…" : t("auth.login_button")}
          </button>
          {seedDomains.length > 0 ? (
            <p className="text-xs text-zinc-500">
              {t("auth.domain_rejected").replace("{domains}", seedDomains.join(", "))}
            </p>
          ) : null}
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-sm text-zinc-700">{status}</p>
          <label className="block text-sm font-medium" htmlFor="code">
            {t("auth.otp_label")}
          </label>
          <input
            id="code"
            inputMode="numeric"
            pattern="\d{6}"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded border px-3 py-2 font-mono tracking-widest"
          />
          <label className="block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded border px-3 py-2"
          />
          <label className="block text-sm font-medium" htmlFor="role">
            Role
          </label>
          <input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Product Manager"
            className="w-full rounded border px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-zinc-900 py-2 text-white disabled:opacity-50"
          >
            {loading ? "…" : t("auth.otp_submit")}
          </button>
          <button
            type="button"
            onClick={() => setStage("request")}
            className="w-full rounded border py-2"
          >
            {t("auth.otp_expired")}
          </button>
        </form>
      )}

      {error ? <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
