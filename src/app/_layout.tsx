import 'expo-sqlite/localStorage/install';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { removeRetiredData } from '@/services/app-migrations';

removeRetiredData();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ orientation: 'all' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
