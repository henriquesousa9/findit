import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function uploadToStorage(supabase: SupabaseClient, path: string, file: File) {
  const { error: uploadError } = await supabase.storage
    .from("salon-photos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("salon-photos").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export function useUploadSalonPhoto() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { salonId: string; file: File }) => {
      const ext = EXT_BY_MIME[input.file.type] ?? "jpg";
      const photoUrl = await uploadToStorage(supabase, `${input.salonId}/cover.${ext}`, input.file);
      const { error } = await supabase.from("salons").update({ photo_url: photoUrl }).eq("id", input.salonId);
      if (error) throw error;
      return photoUrl;
    },
    onSuccess: (_url, vars) => {
      queryClient.invalidateQueries({ queryKey: ["my-salon"] });
      queryClient.invalidateQueries({ queryKey: ["admin-salons"] });
      queryClient.invalidateQueries({ queryKey: ["salon", vars.salonId] });
    },
  });
}

export function useUploadServicePhoto(salonId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { serviceId: string; file: File }) => {
      const ext = EXT_BY_MIME[input.file.type] ?? "jpg";
      const photoUrl = await uploadToStorage(supabase, `${salonId}/services/${input.serviceId}.${ext}`, input.file);
      const { error } = await supabase.from("services").update({ photo_url: photoUrl }).eq("id", input.serviceId);
      if (error) throw error;
      return photoUrl;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salon-services", salonId] }),
  });
}
