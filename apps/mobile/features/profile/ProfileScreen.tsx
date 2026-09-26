import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput } from 'react-native';
import { LEGAL_SLUGS, getDocument } from '@yemesek/legal';
import { readSession, type SessionUser } from '../auth/session';
import { useSession } from '../auth/SessionProvider';
import { ApiError, getJson, postJson } from '../api/client';
import { useOnboarding } from '../onboarding/OnboardingProvider/OnboardingProvider';
import { colors } from '../theme/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { show } = useOnboarding();
  const { user, signOut, refreshUser } = useSession();
  const [info, setInfo] = useState('');
  const [password, setPassword] = useState('');

  async function removeAccount() {
    setInfo('');
    try {
      const result = await postJson<{ deletion?: string; evidencePurgeAfter?: string }>('/auth/me/delete', { password }, true);
      setPassword('');
      setInfo(
        result.deletion === 'scheduled'
          ? 'Hesap kapatıldı. Kanıt dosyaları saklama süresi bitince silinir.'
          : 'Hesap kapatıldı.',
      );
      await signOut();
    } catch (caught) {
      setInfo(caught instanceof ApiError ? caught.message : 'Hesap silinemedi.');
    }
  }

  async function logout() {
    const session = await readSession();
    if (session) {
      try {
        await postJson('/auth/logout', { refreshToken: session.refreshToken });
      } catch {
        // Local session still goes away.
      }
    }
    await signOut();
  }

  async function download() {
    setInfo('');
    try {
      const data = await getJson<unknown>('/auth/me/export', true);
      const text = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'yemesek-verilerim.json';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: text });
      }
    } catch (caught) {
      setInfo(caught instanceof ApiError ? caught.message : 'Veri indirilemedi.');
    }
  }

  async function withdrawMarketing() {
    setInfo('');
    try {
      const fresh = await postJson<SessionUser>('/auth/me/marketing', { acceptMarketing: false }, true);
      if (fresh) await refreshUser(fresh);
      setInfo('Pazarlama rızası geri alındı.');
    } catch (caught) {
      setInfo(caught instanceof ApiError ? caught.message : 'Rıza güncellenemedi.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{user ? user.displayName : 'Profil'}</Text>
      <Text style={styles.meta}>{user ? user.email : 'Şikayet yazmak için giriş yap.'}</Text>
      {user ? (
        <>
          <Pressable style={styles.primary} accessibilityLabel="Verilerimi indir" onPress={() => void download()}>
            <Text style={styles.primaryText}>Verilerimi indir</Text>
          </Pressable>
          <Pressable style={styles.ghost} accessibilityLabel="Pazarlama rızasını geri al" onPress={() => void withdrawMarketing()}>
            <Text style={styles.ghostText}>Pazarlama rızasını geri al</Text>
          </Pressable>
          <Text style={styles.meta}>
            Hesap kapanır ve oturum silinir. Şikayet metni kalabilir. Fotoğraf ve fiş, saklama süresi bitince silinir.
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Silmek için parola"
            accessibilityLabel="Hesabı silmek için parola"
            style={styles.input}
            autoCapitalize="none"
          />
          <Pressable style={styles.primary} accessibilityLabel="Hesabı sil" onPress={() => void removeAccount()}>
            <Text style={styles.primaryText}>Hesabı sil</Text>
          </Pressable>
          <Pressable style={styles.ghost} accessibilityLabel="Çıkış" onPress={() => void logout()}>
            <Text style={styles.ghostText}>Çıkış</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.primary} onPress={() => router.push('/giris')}>
            <Text style={styles.primaryText}>Giriş</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={() => router.push('/kayit')}>
            <Text style={styles.ghostText}>Kayıt</Text>
          </Pressable>
        </>
      )}
      {info ? <Text style={styles.meta}>{info}</Text> : null}
      <Pressable accessibilityLabel="Nasıl çalışır?" onPress={show}>
        <Text style={styles.link}>Nasıl çalışır?</Text>
      </Pressable>
      <Text style={styles.section}>Yasal</Text>
      {LEGAL_SLUGS.map((slug) => (
        <Pressable key={slug} onPress={() => router.push(`/yasal/${slug}`)}>
          <Text style={styles.link}>{getDocument(slug)?.title}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  meta: { color: colors.muted },
  section: { marginTop: 12, fontSize: 18, fontWeight: '700', color: colors.ink },
  link: { color: colors.chili, textDecorationLine: 'underline', paddingVertical: 4 },
  primary: { backgroundColor: colors.chili, borderRadius: 999, padding: 14, alignItems: 'center' },
  primaryText: { color: colors.card, fontWeight: '700' },
  ghost: { borderWidth: 1, borderColor: colors.ink, borderRadius: 999, padding: 14, alignItems: 'center' },
  ghostText: { color: colors.ink, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.ink, borderRadius: 12, padding: 12, color: colors.ink },
});
