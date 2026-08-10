"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { HOME_FOR_ROLE, type Role } from "@/lib/auth/roles";
import { errorMessage } from "@/lib/errorMessage";

export function LoginForm({ notice }: { notice: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setSubmitting(false);
      setError(signInError ? signInError.message : "Não foi possível entrar.");
      return;
    }

    // Send each role straight to its own area instead of assuming /dashboard
    // and letting the layout bounce anyone who isn't an owner.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setSubmitting(false);

    if (profileError || !profile) {
      setError(errorMessage(profileError, "Não foi possível carregar o teu perfil."));
      return;
    }

    router.push(HOME_FOR_ROLE[profile.role as Role] ?? "/app-only");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold">Entrar</h1>

        {notice ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>
        ) : null}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "A entrar..." : "Entrar"}
        </button>

        <p className="text-center text-sm text-neutral-500">
          Não tens conta?{" "}
          <Link href="/signup" className="text-neutral-900 underline">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}
