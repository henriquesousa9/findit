"use client";

import { useState } from "react";
import { useMySalon } from "@/lib/hooks/useMySalon";
import { useSalonStaff, useInviteStaff, useDeleteStaff } from "@/lib/hooks/useStaff";
import { errorMessage } from "@/lib/errorMessage";

export default function StaffPage() {
  const { data: salon, isLoading: loadingSalon } = useMySalon();
  const { data: staff, isLoading: loadingStaff } = useSalonStaff(salon?.id);
  const inviteStaff = useInviteStaff(salon?.id ?? "");
  const deleteStaff = useDeleteStaff(salon?.id ?? "");

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Indica o email da conta.");
      return;
    }
    setError(null);
    setInfo(null);
    try {
      await inviteStaff.mutateAsync({ email: email.trim() });
      setEmail("");
      setInfo("Convite enviado — a pessoa tem de o aceitar na app para ficar ativa.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleRemove(staffId: string) {
    if (!window.confirm("Remover este profissional? Também remove o horário associado.")) return;
    setError(null);
    deleteStaff.mutate(staffId, { onError: (err) => setError(errorMessage(err)) });
  }

  if (loadingSalon) return <p className="text-neutral-500">A carregar...</p>;
  if (!salon) return <p className="text-neutral-500">Cria primeiro o teu salão em &quot;Salão&quot;.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Staff</h1>
      <p className="mb-6 text-sm text-neutral-500">
        A pessoa precisa de já ter conta criada na app com este email. Depois de convidada, tem de aceitar o convite
        na app antes de aparecer disponível para marcações.
      </p>

      <form
        onSubmit={handleInvite}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-700">Email da conta</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="profissional@exemplo.com"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={inviteStaff.isPending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {inviteStaff.isPending ? "A convidar..." : "Convidar"}
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {info ? <p className="mb-4 text-sm text-green-600">{info}</p> : null}

      <div className="space-y-2">
        {loadingStaff ? <p className="text-neutral-500">A carregar...</p> : null}
        {staff?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div>
              <p className="font-medium">{s.full_name}</p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  s.status === "accepted" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {s.status === "accepted" ? "Aceite" : "Convite pendente"}
              </span>
            </div>
            <button onClick={() => handleRemove(s.id)} className="text-sm font-medium text-red-600 hover:underline">
              Remover
            </button>
          </div>
        ))}
        {!loadingStaff && staff?.length === 0 ? (
          <p className="text-neutral-500">Ainda não convidaste nenhum profissional.</p>
        ) : null}
      </div>
    </div>
  );
}
