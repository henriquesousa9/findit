import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";

const queryClient = new QueryClient();

// Show notifications while the app is in the foreground too (default RN
// behavior is to suppress them), so confirm/cancel updates aren't missed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const HOME_ROUTE: Record<string, string> = {
  admin: "/(admin)",
  owner: "/(owner)/dashboard",
  staff: "/(staff)/schedule",
  client: "/(client)",
};

const GROUP_FOR_ROLE: Record<string, string> = {
  admin: "(admin)",
  owner: "(owner)",
  staff: "(staff)",
  client: "(client)",
};

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const group = segments[0];
    const inAuthGroup = group === "(auth)";

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    // Authenticated but profile not loaded yet — wait for it before redirecting
    // so we don't briefly bounce users into the wrong role's area.
    if (!profile) return;

    const home = HOME_ROUTE[profile.role] ?? HOME_ROUTE.client;
    const expectedGroup = GROUP_FOR_ROLE[profile.role] ?? GROUP_FOR_ROLE.client;

    if (inAuthGroup || group !== expectedGroup) {
      router.replace(home as any);
    }
  }, [session, profile, loading, segments]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(client)/appointments");
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(client)" />
      <Stack.Screen name="(owner)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
