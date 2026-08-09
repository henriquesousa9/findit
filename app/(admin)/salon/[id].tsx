import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useSalon, useSalonServices } from "../../../src/hooks/useSalon";
import { useSalonAvailability } from "../../../src/hooks/useAvailability";
import { useSalonStaff, useInviteStaff, useDeleteStaff } from "../../../src/hooks/useStaff";
import { useUpdateSalonAdmin, useDeleteSalonAdmin } from "../../../src/hooks/useAdminSalons";
import { useUpdateSalonLocation } from "../../../src/hooks/useMySalon";
import { useCreateService, useDeleteService } from "../../../src/hooks/useOwnerServices";
import { useCreateAvailability, useDeleteAvailability } from "../../../src/hooks/useOwnerAvailability";
import { pickImage, useUploadSalonPhoto, useUploadServicePhoto } from "../../../src/hooks/useSalonPhotos";
import { confirmAction, notify } from "../../../src/lib/alert";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function AdminSalonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: salon, isLoading: loadingSalon } = useSalon(id);
  const { data: services } = useSalonServices(id);
  const { data: staff, isLoading: loadingStaff } = useSalonStaff(id);
  const [staffId, setStaffId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (staff && staff.length > 0 && !staffId) setStaffId(staff[0].id);
  }, [staff, staffId]);
  const { data: availability } = useSalonAvailability(id, staffId);

  const updateSalon = useUpdateSalonAdmin();
  const deleteSalon = useDeleteSalonAdmin();
  const createService = useCreateService(id ?? "");
  const deleteService = useDeleteService(id ?? "");
  const inviteStaff = useInviteStaff(id ?? "");
  const deleteStaff = useDeleteStaff(id ?? "");
  const createAvailability = useCreateAvailability(id ?? "", staffId ?? "");
  const deleteAvailability = useDeleteAvailability(id ?? "", staffId ?? "");
  const uploadSalonPhoto = useUploadSalonPhoto();
  const uploadServicePhoto = useUploadServicePhoto(id ?? "");
  const updateLocation = useUpdateSalonLocation();
  const [locating, setLocating] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const [serviceName, setServiceName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("10");

  const [staffEmail, setStaffEmail] = useState("");

  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  useEffect(() => {
    if (salon) {
      setName(salon.name);
      setCity(salon.city);
      setAddress(salon.address ?? "");
      setDescription(salon.description ?? "");
    }
  }, [salon]);

  async function handleSaveSalon() {
    if (!name.trim() || !city.trim() || !id) {
      notify("Campos obrigatórios", "Indica o nome e a cidade do salão.");
      return;
    }
    try {
      await updateSalon.mutateAsync({
        id,
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || undefined,
        description: description.trim() || undefined,
      });
      notify("Guardado", "Salão atualizado.");
    } catch (err: any) {
      notify("Erro ao guardar", err?.message ?? "Tenta novamente.");
    }
  }

  function handleDeleteSalon() {
    if (!id) return;
    confirmAction("Eliminar salão?", "Remove também os serviços, horários e agendamentos associados.", "Eliminar", () =>
      deleteSalon.mutate(id, {
        onSuccess: () => router.replace("/(admin)"),
        onError: (err: any) => notify("Não foi possível eliminar", err?.message ?? "Tenta novamente."),
      })
    );
  }

  async function handleAddService() {
    const durationMinutes = parseInt(duration, 10);
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!serviceName.trim() || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || !Number.isFinite(priceCents)) {
      notify("Dados inválidos", "Verifica o nome, duração (min) e preço (€).");
      return;
    }
    try {
      await createService.mutateAsync({ name: serviceName.trim(), durationMinutes, priceCents });
      setServiceName("");
    } catch (err: any) {
      notify("Erro ao criar serviço", err?.message ?? "Tenta novamente.");
    }
  }

  async function handleAddStaff() {
    if (!staffEmail.trim()) {
      notify("Email obrigatório", "Indica o email da conta já criada na app.");
      return;
    }
    try {
      await inviteStaff.mutateAsync({ email: staffEmail.trim() });
      setStaffEmail("");
    } catch (err: any) {
      notify("Erro ao adicionar", err?.message ?? "Tenta novamente.");
    }
  }

  async function handleChangeSalonPhoto() {
    if (!id) return;
    const picked = await pickImage([16, 9]);
    if (!picked) return;
    try {
      await uploadSalonPhoto.mutateAsync({ salonId: id, ...picked });
    } catch (err: any) {
      notify("Erro ao enviar foto", err?.message ?? "Tenta novamente.");
    }
  }

  async function handleChangeServicePhoto(serviceId: string) {
    const picked = await pickImage([1, 1]);
    if (!picked) return;
    try {
      await uploadServicePhoto.mutateAsync({ serviceId, ...picked });
    } catch (err: any) {
      notify("Erro ao enviar foto", err?.message ?? "Tenta novamente.");
    }
  }

  async function handleUseCurrentLocation() {
    if (!id) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        notify("Permissão necessária", "Ativa a localização para definires onde fica o salão.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      await updateLocation.mutateAsync({
        salonId: id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      notify("Localização guardada", "");
    } catch (err: any) {
      notify("Erro ao obter localização", err?.message ?? "Tenta novamente.");
    } finally {
      setLocating(false);
    }
  }

  async function handleAddAvailability() {
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime) || startTime >= endTime) {
      notify("Horário inválido", "Usa o formato HH:MM e garante que a hora de início é antes da de fim.");
      return;
    }
    try {
      await createAvailability.mutateAsync({ weekday, startTime: `${startTime}:00`, endTime: `${endTime}:00` });
    } catch (err: any) {
      notify("Erro ao adicionar horário", err?.message ?? "Tenta novamente.");
    }
  }

  if (loadingSalon) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!salon) return <Text style={styles.error}>Salão não encontrado.</Text>;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, gap: 24 }}
      data={[1]}
      keyExtractor={() => "content"}
      renderItem={() => (
        <View style={{ gap: 24 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.sectionTitle}>Dados do salão</Text>
            <Pressable onPress={handleChangeSalonPhoto}>
              {salon.photo_url ? (
                <Image source={{ uri: salon.photo_url }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Text style={styles.photoPlaceholderText}>
                    {uploadSalonPhoto.isPending ? "A enviar..." : "Adicionar foto de capa"}
                  </Text>
                </View>
              )}
            </Pressable>
            <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Cidade" value={city} onChangeText={setCity} />
            <TextInput style={styles.input} placeholder="Morada" value={address} onChangeText={setAddress} />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Descrição"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Pressable style={styles.button} onPress={handleSaveSalon} disabled={updateSalon.isPending}>
              <Text style={styles.buttonText}>Guardar</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleUseCurrentLocation} disabled={locating}>
              <Text style={styles.secondaryButtonText}>
                {locating ? "A obter localização..." : salon.latitude ? "Atualizar localização atual" : "Usar localização atual"}
              </Text>
            </Pressable>
            <Pressable style={styles.dangerButton} onPress={handleDeleteSalon} disabled={deleteSalon.isPending}>
              <Text style={styles.dangerButtonText}>Eliminar salão</Text>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.sectionTitle}>Serviços</Text>
            <TextInput style={styles.input} placeholder="Nome do serviço" value={serviceName} onChangeText={setServiceName} />
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
            <Pressable style={styles.button} onPress={handleAddService} disabled={createService.isPending}>
              <Text style={styles.buttonText}>Adicionar serviço</Text>
            </Pressable>
            {services?.map((s) => (
              <View key={s.id} style={styles.row}>
                <Pressable onPress={() => handleChangeServicePhoto(s.id)}>
                  {s.photo_url ? (
                    <Image source={{ uri: s.photo_url }} style={styles.thumbnail} />
                  ) : (
                    <View style={[styles.thumbnail, styles.photoPlaceholder]}>
                      <Text style={styles.thumbnailPlaceholderText}>Foto</Text>
                    </View>
                  )}
                </Pressable>
                <Text style={[styles.rowText, { flex: 1 }]}>
                  {s.name} · {s.duration_minutes} min · {(s.price_cents / 100).toFixed(2)} €
                </Text>
                <Pressable
                  onPress={() =>
                    deleteService.mutate(s.id, {
                      onError: (err: any) => notify("Erro", err?.message ?? "Tenta novamente."),
                    })
                  }
                >
                  <Text style={styles.delete}>Remover</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.sectionTitle}>Staff</Text>
            <Text style={styles.rowText}>A pessoa precisa de já ter conta criada na app.</Text>
            <TextInput
              style={styles.input}
              placeholder="Email da conta"
              autoCapitalize="none"
              keyboardType="email-address"
              value={staffEmail}
              onChangeText={setStaffEmail}
            />
            <Pressable style={styles.button} onPress={handleAddStaff} disabled={inviteStaff.isPending}>
              <Text style={styles.buttonText}>Adicionar profissional</Text>
            </Pressable>
            {staff?.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{s.full_name}</Text>
                  <Text style={s.status === "accepted" ? styles.statusAccepted : styles.statusPending}>
                    {s.status === "accepted" ? "Aceite" : "Convite pendente"}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    deleteStaff.mutate(s.id, {
                      onError: (err: any) => notify("Erro", err?.message ?? "Tenta novamente."),
                    })
                  }
                >
                  <Text style={styles.delete}>Remover</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.sectionTitle}>Horário</Text>
            {loadingStaff ? <ActivityIndicator /> : null}
            {!loadingStaff && (!staff || staff.length === 0) ? (
              <Text style={styles.rowText}>Adiciona primeiro um profissional acima.</Text>
            ) : (
              <FlatList
                horizontal
                data={staff}
                keyExtractor={(s) => s.id}
                contentContainerStyle={{ gap: 8, marginBottom: 4 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.dayChip, staffId === item.id && styles.dayChipSelected]}
                    onPress={() => setStaffId(item.id)}
                  >
                    <Text style={staffId === item.id ? styles.dayChipTextSelected : styles.dayChipText}>
                      {item.full_name}
                    </Text>
                  </Pressable>
                )}
              />
            )}
            <FlatList
              horizontal
              data={WEEKDAYS}
              keyExtractor={(d) => d}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item, index }) => (
                <Pressable
                  style={[styles.dayChip, weekday === index && styles.dayChipSelected]}
                  onPress={() => setWeekday(index)}
                >
                  <Text style={weekday === index ? styles.dayChipTextSelected : styles.dayChipText}>
                    {item.slice(0, 3)}
                  </Text>
                </Pressable>
              )}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Início (HH:MM)"
                value={startTime}
                onChangeText={setStartTime}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Fim (HH:MM)"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
            <Pressable style={styles.button} onPress={handleAddAvailability} disabled={createAvailability.isPending}>
              <Text style={styles.buttonText}>Adicionar horário</Text>
            </Pressable>
            {availability?.map((a) => (
              <View key={a.id} style={styles.row}>
                <Text style={styles.rowText}>
                  {WEEKDAYS[a.weekday]} · {a.start_time.slice(0, 5)} - {a.end_time.slice(0, 5)}
                </Text>
                <Pressable
                  onPress={() =>
                    deleteAvailability.mutate(a.id, {
                      onError: (err: any) => notify("Erro", err?.message ?? "Tenta novamente."),
                    })
                  }
                >
                  <Text style={styles.delete}>Remover</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  dangerButton: { borderWidth: 1, borderColor: "#c0392b", borderRadius: 8, padding: 12, alignItems: "center" },
  dangerButtonText: { color: "#c0392b", fontWeight: "600" },
  secondaryButton: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, alignItems: "center" },
  secondaryButtonText: { color: "#111", fontWeight: "600" },
  row: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: { fontSize: 14 },
  photo: { width: "100%", height: 160, borderRadius: 10 },
  photoPlaceholder: { backgroundColor: "#f2f2f2", alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { color: "#888", fontWeight: "600" },
  thumbnail: { width: 40, height: 40, borderRadius: 8 },
  thumbnailPlaceholderText: { color: "#999", fontSize: 9, fontWeight: "600" },
  delete: { color: "#c0392b", fontWeight: "600" },
  statusAccepted: { fontSize: 12, color: "#2563eb", marginTop: 2 },
  statusPending: { fontSize: 12, color: "#b45309", marginTop: 2 },
  dayChip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  dayChipSelected: { backgroundColor: "#111", borderColor: "#111" },
  dayChipText: { color: "#333" },
  dayChipTextSelected: { color: "#fff" },
  error: { color: "#c0392b", marginTop: 40, textAlign: "center" },
});
