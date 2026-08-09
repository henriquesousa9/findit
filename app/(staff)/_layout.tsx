import { Tabs } from "expo-router";

export default function StaffLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="schedule" options={{ title: "Horário" }} />
      <Tabs.Screen name="appointments" options={{ title: "Agendamentos" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
