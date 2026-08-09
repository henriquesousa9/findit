import { Tabs } from "expo-router";

export default function OwnerLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="dashboard" options={{ title: "Agenda" }} />
      <Tabs.Screen name="staff" options={{ title: "Staff" }} />
      <Tabs.Screen name="services" options={{ title: "Serviços" }} />
      <Tabs.Screen name="schedule" options={{ title: "Horário" }} />
      <Tabs.Screen name="salon-settings" options={{ title: "Salão" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
