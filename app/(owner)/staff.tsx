import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useMySalon } from "../../src/hooks/useMySalon";
import { useSalonStaff, useInviteStaff, useDeleteStaff } from "../../src/hooks/useStaff";
import { confirmAction, notify } from "../../src/lib/alert";

export default function StaffScreen() {
  const { data: salon, isLoading: loadingSalon } = useMySalon();
  const { data: staff, isLoading: loadingStaff } = useSalonStaff(salon?.id);
  const inviteStaff = useInviteStaff(salon?.id ?? "");
  const deleteStaff = useDeleteStaff(salon?.id ?? "");

  const [email, setEmail] = useState("");

  async function handleAdd() {
    if (!email.trim()) {
      notify("Email obrigatório", "Indica o email da conta já criada na app.");
      return;
    }
    try {
      await inviteStaff.mutateAsync({ email: email.trim() });
      setEmail("");
    } catch (err: any) {
      notify("Erro ao adicionar", err?.message ?? "Tenta novamente.");
    }
  }

  function handleDelete(staffId: string) {
    confirmAction(
      "Remover profissional?",
      "Também remove o horário associado a este profissional. A conta volta a ser cliente normal.",
      "Remover",
      () =>
        deleteStaff.mutate(staffId, {
          onError: (err: any) => notify("Não foi possível remover", err?.message ?? "Tenta novamente."),
        })
    );
  }

  if (loadingSalon) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!salon) return <Text style={styles.empty}>Cria primeiro o teu salão em "Salão".</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        A pessoa precisa de já ter conta criada na app (com o email abaixo) antes de a poderes adicionar como staff.
      </Text>
      <View style={styles.form}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Email da conta"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Pressable style={styles.button} onPress={handleAdd} disabled={inviteStaff.isPending}>
          <Text style={styles.buttonText}>Adicionar</Text>
        </Pressable>
      </View>

      {loadingStaff ? <ActivityIndicator /> : null}
      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, marginTop: 16 }}
        ListEmptyComponent={!loadingStaff ? <Text style={styles.empty}>Sem profissionais ainda.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.cardTitle}>{item.full_name}</Text>
              <Text style={item.status === "accepted" ? styles.statusAccepted : styles.statusPending}>
                {item.status === "accepted" ? "Aceite" : "Convite pendente"}
              </Text>
            </View>
            <Pressable onPress={() => handleDelete(item.id)}>
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
  hint: { color: "#888", fontSize: 13, marginBottom: 12 },
  form: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 12, justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { color: "#fff", fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  statusAccepted: { fontSize: 12, color: "#2563eb", marginTop: 2 },
  statusPending: { fontSize: 12, color: "#b45309", marginTop: 2 },
  delete: { color: "#c0392b", fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 40, padding: 16 },
});
