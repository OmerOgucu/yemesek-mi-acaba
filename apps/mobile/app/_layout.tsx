import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../features/auth/SessionProvider';
import { SelectionProvider } from '../features/restaurants/SelectionProvider';
import { colors } from '../features/theme/theme';

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
          <Stack.Screen name="dogrula" options={{ title: 'E-posta doğrulama' }} />
          <Stack.Screen name="mekan-ekle" options={{ title: 'Mekan ekle' }} />
          <Stack.Screen name="yasal/[slug]" options={{ title: 'Yasal metin' }} />
        </Stack>
      </SelectionProvider>
    </SessionProvider>
  );
}
