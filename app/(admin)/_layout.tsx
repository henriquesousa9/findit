import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Salões (admin)" }} />
      <Stack.Screen name="salon/[id]" options={{ title: "Editar salão" }} />
    </Stack>
  );
}
