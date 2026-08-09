import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSalonAvailability } from "../../../src/hooks/useAvailability";
import { useSalonStaff } from "../../../src/hooks/useStaff";
import { useCreateAppointment } from "../../../src/hooks/useAppointments";
import { notify } from "../../../src/lib/alert";

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

function slotsForDay(day: Date, startTime: string, endTime: string) {
  const [startH] = startTime.split(":").map(Number);
  const [endH] = endTime.split(":").map(Number);
  const slots: Date[] = [];
  for (let h = startH; h < endH; h++) {
    const slot = new Date(day);
    slot.setHours(h, 0, 0, 0);
    if (slot.getTime() > Date.now()) slots.push(slot);
  }
  return slots;
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
  const [staffId, setStaffId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (staff.length > 0 && !staffId) setStaffId(staff[0].id);
  }, [staff, staffId]);

  const { data: availability, isLoading: loadingAvailability } = useSalonAvailability(salonId, staffId);
  const createAppointment = useCreateAppointment();
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const days = useMemo(() => nextDays(14), []);

  const slots = useMemo(() => {
    if (!availability) return [];
    const weekday = selectedDay.getDay();
    const dayAvailability = availability.filter((a) => a.weekday === weekday);
    return dayAvailability.flatMap((a) => slotsForDay(selectedDay, a.start_time, a.end_time));
  }, [availability, selectedDay]);

  async function handleBook(slot: Date) {
    if (!staffId) return;
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{serviceName}</Text>

      <Text style={styles.sectionLabel}>Profissional</Text>
      <FlatList
        horizontal
        data={staff}
        keyExtractor={(s) => s.id}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.staffChip, staffId === item.id && styles.staffChipSelected]}
            onPress={() => setStaffId(item.id)}
          >
            <Text style={staffId === item.id ? styles.staffChipTextSelected : styles.staffChipText}>
              {item.full_name}
            </Text>
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

      {loadingAvailability ? <ActivityIndicator /> : null}

      <FlatList
        data={slots}
        keyExtractor={(s) => s.toISOString()}
        contentContainerStyle={{ gap: 8 }}
        ListEmptyComponent={
          !loadingAvailability ? <Text style={styles.empty}>Sem horários disponíveis neste dia.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.slot} onPress={() => handleBook(item)} disabled={createAppointment.isPending}>
            <Text style={styles.slotText}>
              {item.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Pressable>
        )}
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
  empty: { color: "#888", marginTop: 16 },
});
