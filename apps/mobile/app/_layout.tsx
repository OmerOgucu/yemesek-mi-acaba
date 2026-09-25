import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError, getJson } from '../features/api/client';
import { SessionProvider } from '../features/auth/SessionProvider';
import { SelectionProvider } from '../features/restaurants/SelectionProvider';
import { colors } from '../features/theme/theme';

export default function RootLayout() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    void getJson('/restaurants').catch((caught) => {
      if (caught instanceof ApiError && caught.status === 426) setBlocked(true);
    });
  }, []);

  if (blocked) {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Lütfen güncelleyin</Text>
        <Text style={styles.blockBody}>Bu sürüm artık yazmaya yetmiyor. Mağazadan yeni sürümü aç.</Text>
      </View>
    );
  }

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

const styles = StyleSheet.create({
  block: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', padding: 24 },
  blockTitle: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  blockBody: { color: colors.muted, marginTop: 8 },
});
