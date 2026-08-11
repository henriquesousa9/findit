import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useMyStaffMemberships } from "../../src/hooks/useMyStaffMemberships";
import { useSalonAvailability } from "../../src/hooks/useAvailability";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Read-only by design: working hours are set by the salon owner, and the
// database enforces it (only availability_write_salon_owner grants writes).
export default function StaffScheduleScreen() {
  const { data: memberships, isLoading: loadingMemberships } = useMyStaffMemberships();
  const [staffId, setStaffId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (memberships && memberships.length > 0 && !staffId) setStaffId(memberships[0].id);
  }, [memberships, staffId]);

  const current = memberships?.find((m) => m.id === staffId);
  const { data: availability, isLoading: loadingAvailability } = useSalonAvailability(current?.salon_id, staffId);

  if (loadingMemberships) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!memberships || memberships.length === 0) {
    return <Text style={styles.empty}>Ainda não és staff de nenhum salão.</Text>;
  }

  const sorted = [...(availability ?? [])].sort(
    (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
  );

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        As horas de trabalho são definidas pelo salão. Se precisares de as alterar, fala com o dono.
      </Text>

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

      {loadingAvailability ? <ActivityIndicator /> : null}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, marginTop: 8 }}
        ListEmptyComponent={
          !loadingAvailability ? <Text style={styles.empty}>O salão ainda não te definiu horário.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {WEEKDAYS[item.weekday]} · {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  hint: { color: "#888", fontSize: 13, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 8 },
  staffChip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  staffChipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  staffChipText: { color: "#333" },
  staffChipTextSelected: { color: "#fff" },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 40, padding: 16 },
});
