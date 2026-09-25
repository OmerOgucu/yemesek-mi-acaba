import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, getJson, postJson } from '../api/client';
import { useSession } from './SessionProvider';
import type { SessionUser } from './session';
import { colors } from '../theme/theme';

export default function VerifyScreen() {
  const router = useRouter();
  const { user, refreshUser } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!user) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Doğrulama için giriş</Text>
        <Pressable style={styles.primary} onPress={() => router.push('/giris')}>
          <Text style={styles.primaryText}>Giriş</Text>
        </Pressable>
      </View>
    );
  }

  async function submit() {
    setError('');
    try {
      const fresh = await postJson<SessionUser>('/auth/verify', { code }, true);
      await refreshUser(fresh);
      setInfo('E-posta doğrulandı.');
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kod doğrulanamadı.');
    }
  }

  async function resend() {
    setError('');
    try {
      await postJson('/auth/verify/resend', {}, true);
      setInfo('Yeni kod gönderildi. Yerel geliştirmede API günlüğüne düşer.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kod gönderilemedi.');
    }
  }

  async function reload() {
    try {
      const fresh = await getJson<SessionUser>('/auth/me', true);
      await refreshUser(fresh);
      if (fresh.emailVerified) router.replace('/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Hesap okunamadı.');
    }
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>E-postanı doğrula</Text>
      <Text style={styles.hint}>6 haneli kod. Mekan, şikayet ve oy bundan sonra açılır.</Text>
      <TextInput style={styles.input} keyboardType="number-pad" placeholder="Kod" value={code} onChangeText={setCode} maxLength={6} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.ok}>{info}</Text> : null}
      <Pressable style={styles.primary} onPress={() => void submit()}>
        <Text style={styles.primaryText}>Doğrula</Text>
      </Pressable>
      <Pressable style={styles.ghost} onPress={() => void resend()}>
        <Text style={styles.ghostText}>Kodu yeniden gönder</Text>
      </Pressable>
      <Pressable style={styles.ghost} onPress={() => void reload()}>
        <Text style={styles.ghostText}>Bağlantıyı kullandıysam yenile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  hint: { color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 12, padding: 12, color: colors.ink },
  primary: { backgroundColor: colors.chili, borderRadius: 999, padding: 14, alignItems: 'center' },
  primaryText: { color: colors.card, fontWeight: '700' },
  ghost: { borderWidth: 1, borderColor: colors.ink, borderRadius: 999, padding: 14, alignItems: 'center' },
  ghostText: { color: colors.ink, fontWeight: '700' },
  error: { color: colors.chili },
  ok: { color: '#2f6b45' },
});
