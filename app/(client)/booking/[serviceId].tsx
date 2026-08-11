import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSalonStaff } from "../../../src/hooks/useStaff";
import { useAvailableSlots } from "../../../src/hooks/useAvailableSlots";
import { useCreateAppointment } from "../../../src/hooks/useAppointments";
import { notify } from "../../../src/lib/alert";

// Sentinel for the "no preference" chip — distinct from a real staff id.
const ANY_STAFF = "__any__";

function nextDays(count: number) {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function BookingScreen() {
  const { serviceId, salonId, serviceName } = useLocalSearchParams<{
    serviceId: string;
    salonId: string;
    serviceName: string;
  }>();
  const router = useRouter();

  const { data: allStaff, isLoading: loadingStaff } = useSalonStaff(salonId);
  const staff = useMemo(() => (allStaff ?? []).filter((s) => s.status === "accepted"), [allStaff]);

  const [choice, setChoice] = useState<string>(ANY_STAFF);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const days = useMemo(() => nextDays(14), []);

  const staffId = choice === ANY_STAFF ? undefined : choice;
  const { data: slots, isLoading: loadingSlots } = useAvailableSlots(salonId, serviceId, selectedDay, staffId);
  const createAppointment = useCreateAppointment();

  async function handleBook(slot: Date) {
    try {
      await createAppointment.mutateAsync({ salonId, serviceId, staffId, startsAt: slot });
      notify("Marcação criada", "O teu agendamento ficou pendente de confirmação.");
      router.replace("/(client)/appointments");
    } catch (err: any) {
      notify("Não foi possível marcar", err?.message ?? "Tenta outro horário.");
    }
  }

  if (loadingStaff) return <ActivityIndicator style={{ marginTop: 40 }} />;

  if (staff.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{serviceName}</Text>
        <Text style={styles.empty}>Este salão ainda não tem profissionais disponíveis para marcação.</Text>
      </View>
    );
  }

  const options = [{ id: ANY_STAFF, label: "Sem preferência" }, ...staff.map((s) => ({ id: s.id, label: s.full_name }))];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{serviceName}</Text>

      <Text style={styles.sectionLabel}>Profissional</Text>
      <FlatList
        horizontal
        data={options}
        keyExtractor={(o) => o.id}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.staffChip, choice === item.id && styles.staffChipSelected]}
            onPress={() => setChoice(item.id)}
          >
            <Text style={choice === item.id ? styles.staffChipTextSelected : styles.staffChipText}>{item.label}</Text>
          </Pressable>
        )}
      />

      <FlatList
        horizontal
        data={days}
        keyExtractor={(d) => d.toISOString()}
        style={{ flexGrow: 0, marginVertical: 12 }}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => {
          const isSelected = item.toDateString() === selectedDay.toDateString();
          return (
            <Pressable
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => setSelectedDay(item)}
            >
              <Text style={isSelected ? styles.dayChipTextSelected : styles.dayChipText}>
                {item.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" })}
              </Text>
            </Pressable>
          );
        }}
      />

      {loadingSlots ? <ActivityIndicator /> : null}

      <FlatList
        data={slots ?? []}
        keyExtractor={(s) => s.slot}
        contentContainerStyle={{ gap: 8 }}
        ListEmptyComponent={
          !loadingSlots ? <Text style={styles.empty}>Sem horários disponíveis neste dia.</Text> : null
        }
        renderItem={({ item }) => {
          const start = new Date(item.slot);
          return (
            <Pressable
              style={styles.slot}
              onPress={() => handleBook(start)}
              disabled={createAppointment.isPending}
            >
              <Text style={styles.slotText}>
                {start.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
              </Text>
              {choice === ANY_STAFF && item.free_staff > 1 ? (
                <Text style={styles.slotHint}>{item.free_staff} profissionais livres</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 16, marginBottom: 8 },
  staffChip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  staffChipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  staffChipText: { color: "#333" },
  staffChipTextSelected: { color: "#fff" },
  dayChip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  dayChipSelected: { backgroundColor: "#111", borderColor: "#111" },
  dayChipText: { color: "#333" },
  dayChipTextSelected: { color: "#fff" },
  slot: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 14, alignItems: "center" },
  slotText: { fontSize: 16, fontWeight: "600" },
  slotHint: { fontSize: 12, color: "#888", marginTop: 2 },
  empty: { color: "#888", marginTop: 16 },
});
