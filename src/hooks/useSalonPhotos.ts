import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function pickImage(aspect: [number, number] = [16, 9]) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? "image/jpeg";
  return { uri: asset.uri, mimeType, ext: EXT_BY_MIME[mimeType] ?? "jpg" };
}

async function uploadToStorage(path: string, uri: string, mimeType: string) {
  const arraybuffer = await fetch(uri).then((res) => res.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("salon-photos")
    .upload(path, arraybuffer, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("salon-photos").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export function useUploadSalonPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { salonId: string; uri: string; mimeType: string; ext: string }) => {
      const photoUrl = await uploadToStorage(`${input.salonId}/cover.${input.ext}`, input.uri, input.mimeType);
      const { error } = await supabase.from("salons").update({ photo_url: photoUrl }).eq("id", input.salonId);
      if (error) throw error;
      return photoUrl;
    },
    onSuccess: (_url, vars) => {
      queryClient.invalidateQueries({ queryKey: ["my-salon"] });
      queryClient.invalidateQueries({ queryKey: ["salon", vars.salonId] });
      queryClient.invalidateQueries({ queryKey: ["salons"] });
      queryClient.invalidateQueries({ queryKey: ["admin-salons"] });
    },
  });
}

export function useUploadServicePhoto(salonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { serviceId: string; uri: string; mimeType: string; ext: string }) => {
      const photoUrl = await uploadToStorage(
        `${salonId}/services/${input.serviceId}.${input.ext}`,
        input.uri,
        input.mimeType
      );
      const { error } = await supabase.from("services").update({ photo_url: photoUrl }).eq("id", input.serviceId);
      if (error) throw error;
      return photoUrl;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salon-services", salonId] }),
  });
}
