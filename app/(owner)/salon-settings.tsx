import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { useMySalon, useUpsertMySalon, useUpdateSalonLocation } from "../../src/hooks/useMySalon";
import { pickImage, useUploadSalonPhoto } from "../../src/hooks/useSalonPhotos";
import { notify } from "../../src/lib/alert";

export default function SalonSettingsScreen() {
  const { data: salon, isLoading } = useMySalon();
  const upsertSalon = useUpsertMySalon();
  const uploadPhoto = useUploadSalonPhoto();
  const updateLocation = useUpdateSalonLocation();
  const [locating, setLocating] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (salon) {
      setName(salon.name);
      setCity(salon.city);
      setAddress(salon.address ?? "");
      setDescription(salon.description ?? "");
    }
  }, [salon]);

  async function handleSave() {
    if (!name.trim() || !city.trim()) {
      notify("Campos obrigatórios", "Indica o nome e a cidade do salão.");
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
      notify("Guardado", "As definições do salão foram atualizadas.");
    } catch (err: any) {
      notify("Erro ao guardar", err?.message ?? "Tenta novamente.");
    }
  }

  async function handleChangePhoto() {
    if (!salon) return;
    const picked = await pickImage([16, 9]);
    if (!picked) return;
    try {
      await uploadPhoto.mutateAsync({ salonId: salon.id, ...picked });
    } catch (err: any) {
      notify("Erro ao enviar foto", err?.message ?? "Tenta novamente.");
    }
  }

  async function handleUseCurrentLocation() {
    if (!salon) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        notify("Permissão necessária", "Ativa a localização para definires onde fica o salão.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      await updateLocation.mutateAsync({
        salonId: salon.id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      notify("Localização guardada", "Os clientes já vão conseguir encontrar-te por \"perto de mim\".");
    } catch (err: any) {
      notify("Erro ao obter localização", err?.message ?? "Tenta novamente.");
    } finally {
      setLocating(false);
    }
  }

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{salon ? "Editar salão" : "Criar o teu salão"}</Text>

      {salon ? (
        <Pressable onPress={handleChangePhoto} style={styles.photoPicker}>
          {salon.photo_url ? (
            <Image source={{ uri: salon.photo_url }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>
                {uploadPhoto.isPending ? "A enviar..." : "Adicionar foto de capa"}
              </Text>
            </View>
          )}
        </Pressable>
      ) : null}

      <TextInput style={styles.input} placeholder="Nome do salão" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Cidade" value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="Morada (opcional)" value={address} onChangeText={setAddress} />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Pressable style={styles.button} onPress={handleSave} disabled={upsertSalon.isPending}>
        {upsertSalon.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Guardar</Text>
        )}
      </Pressable>

      {salon ? (
        <Pressable style={styles.secondaryButton} onPress={handleUseCurrentLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              {salon.latitude ? "Atualizar localização atual" : "Usar localização atual"}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  photoPicker: { marginBottom: 4 },
  photo: { width: "100%", height: 160, borderRadius: 10 },
  photoPlaceholder: { backgroundColor: "#f2f2f2", alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { color: "#888", fontWeight: "600" },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondaryButton: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 14, alignItems: "center" },
  secondaryButtonText: { color: "#111", fontWeight: "600", fontSize: 16 },
});
