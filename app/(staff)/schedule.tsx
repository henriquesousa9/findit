import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useMyStaffMemberships } from "../../src/hooks/useMyStaffMemberships";
import { useSalonAvailability } from "../../src/hooks/useAvailability";
import { useCreateAvailability, useDeleteAvailability } from "../../src/hooks/useOwnerAvailability";
import { notify } from "../../src/lib/alert";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function StaffScheduleScreen() {
  const { data: memberships, isLoading: loadingMemberships } = useMyStaffMemberships();
  const [staffId, setStaffId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (memberships && memberships.length > 0 && !staffId) setStaffId(memberships[0].id);
  }, [memberships, staffId]);

  const current = memberships?.find((m) => m.id === staffId);
  const { data: availability, isLoading: loadingAvailability } = useSalonAvailability(current?.salon_id, staffId);
  const createAvailability = useCreateAvailability(current?.salon_id ?? "", staffId ?? "");
  const deleteAvailability = useDeleteAvailability(current?.salon_id ?? "", staffId ?? "");

  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  async function handleAdd() {
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

  if (loadingMemberships) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!memberships || memberships.length === 0) {
    return <Text style={styles.empty}>Ainda não és staff de nenhum salão.</Text>;
  }

  return (
    <View style={styles.container}>
      {memberships.length > 1 ? (
        <>
          <Text style={styles.sectionLabel}>Salão</Text>
          <FlatList
            horizontal
            data={memberships}
            keyExtractor={(m) => m.id}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 8, marginBottom: 12 }}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.staffChip, staffId === item.id && styles.staffChipSelected]}
                onPress={() => setStaffId(item.id)}
              >
                <Text style={staffId === item.id ? styles.staffChipTextSelected : styles.staffChipText}>
                  {item.salon?.name ?? "Salão"}
                </Text>
              </Pressable>
            )}
          />
        </>
      ) : null}

      <View style={styles.form}>
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
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
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
        <Pressable style={styles.button} onPress={handleAdd} disabled={createAvailability.isPending}>
          <Text style={styles.buttonText}>Adicionar horário</Text>
        </Pressable>
      </View>

      {loadingAvailability ? <ActivityIndicator /> : null}
      <FlatList
        data={availability}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, marginTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {WEEKDAYS[item.weekday]} · {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
            </Text>
            <Pressable
              onPress={() =>
                deleteAvailability.mutate(item.id, {
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
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 8 },
  form: { gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  staffChip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  staffChipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  staffChipText: { color: "#333" },
  staffChipTextSelected: { color: "#fff" },
  dayChip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  dayChipSelected: { backgroundColor: "#111", borderColor: "#111" },
  dayChipText: { color: "#333" },
  dayChipTextSelected: { color: "#fff" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  delete: { color: "#c0392b", fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 40, padding: 16 },
});
