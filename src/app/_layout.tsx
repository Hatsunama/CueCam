import 'expo-sqlite/localStorage/install';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ orientation: 'all' }} />
      </Stack>
    </>
  );
}
