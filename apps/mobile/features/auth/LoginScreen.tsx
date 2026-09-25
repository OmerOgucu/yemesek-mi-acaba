import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
      <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="E-posta" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} secureTextEntry placeholder="Parola" value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={() => void submit()}>
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
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 12, padding: 12 },
  primary: { backgroundColor: colors.chili, borderRadius: 999, padding: 14, alignItems: 'center' },
  primaryText: { color: colors.card, fontWeight: '700' },
  error: { color: colors.chili },
  link: { color: colors.chili, textDecorationLine: 'underline' },
});
