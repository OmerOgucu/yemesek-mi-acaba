import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/theme';
import { ApiError, postJson } from '../api/client';
import type { Session } from './session';
import { useSession } from './SessionProvider';

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptKvkk, setAcceptKvkk] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      const session = await postJson<Session>('/auth/register', {
        email,
        password,
        displayName,
        acceptKvkk,
        acceptTerms,
        acceptMarketing,
      });
      await signIn(session);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kayıt tamamlanamadı.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <TextInput style={styles.input} placeholder="Görünen ad" value={displayName} onChangeText={setDisplayName} />
      <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="E-posta" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} secureTextEntry placeholder="Parola" value={password} onChangeText={setPassword} />
      <Check label="KVKK aydınlatma metnini okudum" checked={acceptKvkk} onPress={() => setAcceptKvkk((value) => !value)} />
      <Pressable onPress={() => router.push('/yasal/kvkk')}>
        <Text style={styles.link}>Aydınlatma metnini aç</Text>
      </Pressable>
      <Check label="Kullanım koşullarını kabul ediyorum" checked={acceptTerms} onPress={() => setAcceptTerms((value) => !value)} />
      <Pressable onPress={() => router.push('/yasal/kullanim-kosullari')}>
        <Text style={styles.link}>Koşulları aç</Text>
      </Pressable>
      <Check
        label="Pazarlama için ayrıca açık rıza (isteğe bağlı)"
        checked={acceptMarketing}
        onPress={() => setAcceptMarketing((value) => !value)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.primary, (!acceptKvkk || !acceptTerms) && styles.disabled]} disabled={!acceptKvkk || !acceptTerms} onPress={() => void submit()}>
        <Text style={styles.primaryText}>Hesap aç</Text>
      </Pressable>
    </ScrollView>
  );
}

function Check({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.check} onPress={onPress}>
      <View style={[styles.box, checked && styles.boxOn]} />
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10 },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 12, padding: 12 },
  check: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  box: { width: 18, height: 18, borderWidth: 1, borderColor: colors.ink, borderRadius: 4 },
  boxOn: { backgroundColor: colors.chili },
  checkLabel: { flex: 1, color: colors.ink },
  link: { color: colors.chili, textDecorationLine: 'underline' },
  primary: { backgroundColor: colors.chili, borderRadius: 999, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  primaryText: { color: colors.card, fontWeight: '700' },
  error: { color: colors.chili },
});
