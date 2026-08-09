import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMySalon } from "../../src/hooks/useMySalon";
import { useOwnerAppointments } from "../../src/hooks/useOwnerAppointments";
import { useUpdateAppointmentStatus } from "../../src/hooks/useAppointments";
import { notify } from "../../src/lib/alert";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

export default function DashboardScreen() {
  const { data: salon, isLoading: loadingSalon } = useMySalon();
  const { data: appointments, isLoading } = useOwnerAppointments(salon?.id);
  const updateStatus = useUpdateAppointmentStatus();
  const router = useRouter();

  function handleStatusChange(appointmentId: string, status: "confirmed" | "cancelled" | "completed") {
    updateStatus.mutate(
      { appointmentId, status },
      { onError: (err: any) => notify("Não foi possível atualizar", err?.message ?? "Tenta novamente.") }
    );
  }

  if (loadingSalon) return <ActivityIndicator style={{ marginTop: 40 }} />;

  if (!salon) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.empty}>Ainda não configuraste o teu salão.</Text>
        <Pressable style={styles.button} onPress={() => router.push("/(owner)/salon-settings")}>
          <Text style={styles.buttonText}>Criar salão</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{salon.name}</Text>

      {isLoading ? <ActivityIndicator /> : null}
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, marginTop: 12 }}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>Sem agendamentos.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.services?.name ?? "Serviço"}</Text>
            <Text style={styles.cardSubtitle}>
              {new Date(item.starts_at).toLocaleString("pt-PT", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>

            {item.status === "pending" ? (
              <View style={styles.actions}>
                <Pressable onPress={() => handleStatusChange(item.id, "confirmed")}>
                  <Text style={styles.confirm}>Confirmar</Text>
                </Pressable>
                <Pressable onPress={() => handleStatusChange(item.id, "cancelled")}>
                  <Text style={styles.cancel}>Cancelar</Text>
                </Pressable>
              </View>
            ) : null}
            {item.status === "confirmed" ? (
              <View style={styles.actions}>
                <Pressable onPress={() => handleStatusChange(item.id, "completed")}>
                  <Text style={styles.confirm}>Marcar como concluído</Text>
                </Pressable>
                <Pressable onPress={() => handleStatusChange(item.id, "cancelled")}>
                  <Text style={styles.cancel}>Cancelar</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#555" },
  status: { color: "#888", marginTop: 2 },
  actions: { flexDirection: "row", gap: 16, marginTop: 8 },
  confirm: { color: "#2563eb", fontWeight: "600" },
  cancel: { color: "#c0392b", fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 32 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, paddingHorizontal: 24 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
