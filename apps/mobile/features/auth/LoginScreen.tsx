import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import mark from '../../assets/brand/mark.png';
import { colors } from '../theme/theme';
import { ApiError, postJson } from '../api/client';
import type { Session } from './session';
import { useSession } from './SessionProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      const session = await postJson<Session>('/auth/login', { email, password });
      await signIn(session);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Giriş yapılamadı.');
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.brand} accessibilityLabel="Yemesek Mi">
        <Image source={mark} style={styles.brandMark} resizeMode="contain" />
        <View>
          <Text style={styles.brandName}>Yemesek</Text>
          <Text style={styles.brandMi}>Mi</Text>
          <Text style={styles.brandDomain}>yemesekmi.com</Text>
        </View>
      </View>
      <Text style={styles.tagline}>Mekanları keşfet — kararını kolaylaştır</Text>
      <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="E-posta" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} secureTextEntry placeholder="Parola" value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} accessibilityLabel="Giriş yap" onPress={() => void submit()}>
        <Text style={styles.primaryText}>Giriş yap</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/kayit')}>
        <Text style={styles.link}>Hesabın yok mu? Kayıt ol</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center' },
  brandMark: { width: 62, height: 74 },
  brandName: { color: colors.ink, fontSize: 30, lineHeight: 30, fontWeight: '800' },
  brandMi: { color: colors.chili, fontSize: 24, lineHeight: 25, fontWeight: '800' },
  brandDomain: { color: colors.muted, fontSize: 10, letterSpacing: 1.5 },
  tagline: { color: colors.gold, textAlign: 'center', fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 12, padding: 12 },
  primary: { backgroundColor: colors.chili, borderRadius: 999, padding: 14, alignItems: 'center' },
  primaryText: { color: colors.card, fontWeight: '700' },
  error: { color: colors.chili },
  link: { color: colors.chili, textDecorationLine: 'underline' },
});
