"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useMySalon } from "@/lib/hooks/useMySalon";
import { useOwnerAppointments } from "@/lib/hooks/useAppointments";

function formatEuros(cents: number) {
  return (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function DashboardOverviewPage() {
  const { data: salon, isLoading: loadingSalon } = useMySalon();
  const { data: appointments, isLoading } = useOwnerAppointments(salon?.id);
  // Snapshot once per mount instead of reading Date.now() during render.
  const [now] = useState(() => Date.now());

  const stats = useMemo(() => {
    if (!appointments) return null;

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const pending = appointments.filter((a) => a.status === "pending").length;
    const upcoming = appointments.filter((a) => a.status === "confirmed" && new Date(a.starts_at).getTime() > now).length;
    const completedLast30d = appointments.filter(
      (a) => a.status === "completed" && new Date(a.starts_at).getTime() >= thirtyDaysAgo
    );
    const estimatedValue = completedLast30d.reduce((sum, a) => sum + (a.services?.price_cents ?? 0), 0);

    const byDay = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
      byDay.set(key, 0);
    }
    for (const a of appointments) {
      const d = new Date(a.starts_at);
      const key = d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    return {
      pending,
      upcoming,
      completedCount: completedLast30d.length,
      estimatedValue,
      chartData: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
    };
  }, [appointments, now]);

  if (loadingSalon) return <p className="text-neutral-500">A carregar...</p>;
  if (!salon) return <p className="text-neutral-500">Cria primeiro o teu salão em &quot;Salão&quot; para veres estatísticas.</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Visão geral — {salon.name}</h1>

      {isLoading || !stats ? (
        <p className="text-neutral-500">A carregar...</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Pendentes" value={stats.pending} />
            <StatCard label="Confirmados (a vir)" value={stats.upcoming} />
            <StatCard label="Concluídos (30 dias)" value={stats.completedCount} />
            <StatCard label="Valor estimado (30 dias)" value={formatEuros(stats.estimatedValue)} />
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-neutral-700">Marcações por dia (últimos 14 dias)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" fontSize={12} stroke="#737373" />
                  <YAxis allowDecimals={false} fontSize={12} stroke="#737373" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#171717" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
