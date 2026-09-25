import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { LEGAL_SLUGS, getDocument } from '@yemesek/legal';
import { postJson } from '../../src/api/client';
import { readSession } from '../../src/session/session';
import { useSession } from '../../src/state/SessionProvider';
import { colors } from '../../src/theme/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

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

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{user ? user.displayName : 'Profil'}</Text>
      <Text style={styles.meta}>{user ? user.email : 'Şikayet yazmak için giriş yap.'}</Text>
      {user ? (
        <Pressable style={styles.ghost} onPress={() => void logout()}>
          <Text style={styles.ghostText}>Çıkış</Text>
        </Pressable>
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
});
