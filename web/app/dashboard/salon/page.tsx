"use client";

import { useRef, useState } from "react";
import { useMySalon, useUpsertMySalon, type Salon } from "@/lib/hooks/useMySalon";
import { useUploadSalonPhoto } from "@/lib/hooks/useSalonPhotos";
import { errorMessage } from "@/lib/errorMessage";

export default function SalonPage() {
  const { data: salon, isLoading } = useMySalon();

  if (isLoading) return <p className="text-neutral-500">A carregar...</p>;

  // Keyed by salon id so the form re-initializes its state directly from
  // fresh data on first load, instead of syncing via a useEffect.
  return <SalonForm key={salon?.id ?? "new"} salon={salon ?? null} />;
}

function SalonForm({ salon }: { salon: Salon | null }) {
  const upsertSalon = useUpsertMySalon();
  const uploadPhoto = useUploadSalonPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(salon?.name ?? "");
  const [city, setCity] = useState(salon?.city ?? "");
  const [address, setAddress] = useState(salon?.address ?? "");
  const [description, setDescription] = useState(salon?.description ?? "");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !salon) return;
    setPhotoError(null);
    try {
      await uploadPhoto.mutateAsync({ salonId: salon.id, file });
    } catch (err) {
      setPhotoError(errorMessage(err, "Erro ao enviar foto."));
    } finally {
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      setMessage({ type: "error", text: "Indica o nome e a cidade do salão." });
      return;
    }
    try {
      await upsertSalon.mutateAsync({
        id: salon?.id,
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || undefined,
        description: description.trim() || undefined,
      });
      setMessage({ type: "ok", text: "Salão guardado." });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">{salon ? "Editar salão" : "Criar o teu salão"}</h1>

      {salon ? (
        <div className="mb-6">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPhoto.isPending}
            className="block w-full overflow-hidden rounded-xl border border-neutral-200 bg-white disabled:opacity-50"
          >
            {salon.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salon.photo_url} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-neutral-100 text-sm font-medium text-neutral-500">
                {uploadPhoto.isPending ? "A enviar..." : "Adicionar foto de capa"}
              </div>
            )}
          </button>
          {photoError ? <p className="mt-1 text-sm text-red-600">{photoError}</p> : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Cidade</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Morada (opcional)</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        {message ? (
          <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>{message.text}</p>
        ) : null}

        <button
          type="submit"
          disabled={upsertSalon.isPending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {upsertSalon.isPending ? "A guardar..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}
