import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useMySalon } from "../../src/hooks/useMySalon";
import { useSalonServices } from "../../src/hooks/useSalon";
import { useCreateService, useDeleteService } from "../../src/hooks/useOwnerServices";
import { pickImage, useUploadServicePhoto } from "../../src/hooks/useSalonPhotos";
import { notify } from "../../src/lib/alert";

export default function ServicesScreen() {
  const { data: salon, isLoading: loadingSalon } = useMySalon();
  const { data: services, isLoading: loadingServices } = useSalonServices(salon?.id);
  const createService = useCreateService(salon?.id ?? "");
  const deleteService = useDeleteService(salon?.id ?? "");
  const uploadPhoto = useUploadServicePhoto(salon?.id ?? "");

  async function handleChangePhoto(serviceId: string) {
    const picked = await pickImage([1, 1]);
    if (!picked) return;
    try {
      await uploadPhoto.mutateAsync({ serviceId, ...picked });
    } catch (err: any) {
      notify("Erro ao enviar foto", err?.message ?? "Tenta novamente.");
    }
  }

  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("10");

  async function handleAdd() {
    const durationMinutes = parseInt(duration, 10);
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!name.trim() || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || !Number.isFinite(priceCents)) {
      notify("Dados inválidos", "Verifica o nome, duração (min) e preço (€).");
      return;
    }
    try {
      await createService.mutateAsync({ name: name.trim(), durationMinutes, priceCents });
      setName("");
    } catch (err: any) {
      notify("Erro ao criar serviço", err?.message ?? "Tenta novamente.");
    }
  }

  if (loadingSalon) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!salon) return <Text style={styles.empty}>Cria primeiro o teu salão em "Salão".</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Nome do serviço" value={name} onChangeText={setName} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Duração (min)"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Preço (€)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>
        <Pressable style={styles.button} onPress={handleAdd} disabled={createService.isPending}>
          <Text style={styles.buttonText}>Adicionar serviço</Text>
        </Pressable>
      </View>

      {loadingServices ? <ActivityIndicator /> : null}
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, marginTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => handleChangePhoto(item.id)}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <Text style={styles.thumbnailPlaceholderText}>Foto</Text>
                </View>
              )}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                {item.duration_minutes} min · {(item.price_cents / 100).toFixed(2)} €
              </Text>
            </View>
            <Pressable
              onPress={() =>
                deleteService.mutate(item.id, {
                  onError: (err: any) => notify("Não foi possível remover", err?.message ?? "Tenta novamente."),
                })
              }
            >
              <Text style={styles.delete}>Remover</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  form: { gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbnail: { width: 48, height: 48, borderRadius: 8 },
  thumbnailPlaceholder: { backgroundColor: "#f2f2f2", alignItems: "center", justifyContent: "center" },
  thumbnailPlaceholderText: { color: "#999", fontSize: 10, fontWeight: "600" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#555", marginTop: 2 },
  delete: { color: "#c0392b", fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 40, padding: 16 },
});
