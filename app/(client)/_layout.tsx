import { Tabs } from "expo-router";

export default function ClientLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: "Explorar" }} />
      <Tabs.Screen name="favorites" options={{ title: "Favoritos" }} />
      <Tabs.Screen name="appointments" options={{ title: "Agendamentos" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
      <Tabs.Screen name="salon/[id]" options={{ href: null, title: "Salão" }} />
      <Tabs.Screen name="booking/[serviceId]" options={{ href: null, title: "Marcar" }} />
    </Tabs>
  );
}
