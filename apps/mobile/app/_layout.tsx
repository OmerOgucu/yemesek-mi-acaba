import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SelectionProvider } from '../src/state/SelectionProvider';
import { SessionProvider } from '../src/state/SessionProvider';
import { colors } from '../src/theme/theme';

export default function RootLayout() {
  return (
    <SessionProvider>
      <SelectionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.paper },
            headerTintColor: colors.ink,
            contentStyle: { backgroundColor: colors.paper },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="giris" options={{ title: 'Giriş' }} />
          <Stack.Screen name="kayit" options={{ title: 'Kayıt' }} />
          <Stack.Screen name="yasal/[slug]" options={{ title: 'Yasal metin' }} />
        </Stack>
      </SelectionProvider>
    </SessionProvider>
  );
}
