import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useMyAppointments, useUpdateAppointmentStatus } from "../../src/hooks/useAppointments";
import { confirmAction, notify } from "../../src/lib/alert";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

export default function AppointmentsScreen() {
  const { data: appointments, isLoading, error } = useMyAppointments();
  const updateStatus = useUpdateAppointmentStatus();

  function handleCancel(id: string) {
    confirmAction("Cancelar agendamento?", "Esta ação não pode ser revertida.", "Cancelar agendamento", () =>
      updateStatus.mutate(
        { appointmentId: id, status: "cancelled" },
        { onError: (err: any) => notify("Não foi possível cancelar", err?.message ?? "Tenta novamente.") }
      )
    );
  }

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (error) return <Text style={styles.error}>Erro a carregar agendamentos.</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Ainda não tens agendamentos.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.date}>
              {new Date(item.starts_at).toLocaleString("pt-PT", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            {item.status === "pending" || item.status === "confirmed" ? (
              <Pressable onPress={() => handleCancel(item.id)}>
                <Text style={styles.cancel}>Cancelar</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 14, gap: 4 },
  date: { fontSize: 16, fontWeight: "600" },
  status: { color: "#555" },
  cancel: { color: "#c0392b", marginTop: 6, fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 32 },
  error: { color: "#c0392b", marginTop: 40, textAlign: "center" },
});
