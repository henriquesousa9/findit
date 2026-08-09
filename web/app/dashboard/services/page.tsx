"use client";

import { useRef, useState } from "react";
import { useMySalon } from "@/lib/hooks/useMySalon";
import { useSalonServices, useCreateService, useDeleteService, type Service } from "@/lib/hooks/useServices";
import { useUploadServicePhoto } from "@/lib/hooks/useSalonPhotos";
import { errorMessage } from "@/lib/errorMessage";

export default function ServicesPage() {
  const { data: salon, isLoading: loadingSalon } = useMySalon();
  const { data: services, isLoading: loadingServices } = useSalonServices(salon?.id);
  const createService = useCreateService(salon?.id ?? "");
  const deleteService = useDeleteService(salon?.id ?? "");

  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("10");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const durationMinutes = parseInt(duration, 10);
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!name.trim() || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || !Number.isFinite(priceCents)) {
      setError("Verifica o nome, duração (min) e preço (€).");
      return;
    }
    setError(null);
    try {
      await createService.mutateAsync({ name: name.trim(), durationMinutes, priceCents });
      setName("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loadingSalon) return <p className="text-neutral-500">A carregar...</p>;
  if (!salon) return <p className="text-neutral-500">Cria primeiro o teu salão em &quot;Salão&quot;.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Serviços</h1>

      <form onSubmit={handleAdd} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Duração (min)</label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            type="number"
            className="w-28 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Preço (€)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="0.01"
            className="w-28 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={createService.isPending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="space-y-2">
        {loadingServices ? <p className="text-neutral-500">A carregar...</p> : null}
        {services?.map((s) => (
          <ServiceRow key={s.id} service={s} salonId={salon.id} onDelete={() => deleteService.mutate(s.id)} />
        ))}
        {!loadingServices && services?.length === 0 ? <p className="text-neutral-500">Sem serviços ainda.</p> : null}
      </div>
    </div>
  );
}

function ServiceRow({ service, salonId, onDelete }: { service: Service; salonId: string; onDelete: () => void }) {
  const uploadPhoto = useUploadServicePhoto(salonId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadPhoto.mutateAsync({ serviceId: service.id, file });
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPhoto.isPending}
          className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 disabled:opacity-50"
        >
          {service.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-neutral-500">
              Foto
            </span>
          )}
        </button>
        <div>
          <p className="font-medium">{service.name}</p>
          <p className="text-sm text-neutral-500">
            {service.duration_minutes} min · {(service.price_cents / 100).toFixed(2)} €
          </p>
        </div>
      </div>
      <button onClick={onDelete} className="text-sm font-medium text-red-600 hover:underline">
        Remover
      </button>
    </div>
  );
}
