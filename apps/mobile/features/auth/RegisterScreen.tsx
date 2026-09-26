import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import mark from '../../assets/brand/mark.png';
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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
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
        ageConfirmed,
      });
      await signIn(session);
      router.replace('/dogrula');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kayıt tamamlanamadı.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.brand} accessibilityLabel="Yemesek Mi">
        <Image source={mark} style={styles.brandMark} resizeMode="contain" />
        <View>
          <Text style={styles.brandName}>Yemesek</Text>
          <Text style={styles.brandMi}>Mi</Text>
          <Text style={styles.brandDomain}>yemesekmi.com</Text>
        </View>
      </View>
      <Text style={styles.tagline}>Şikayet yazmak için hesap gerekir. Liste herkese açık kalır.</Text>
      <TextInput style={styles.input} placeholder="Görünen ad" value={displayName} onChangeText={setDisplayName} />
      <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="E-posta" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} secureTextEntry placeholder="Parola" value={password} onChangeText={setPassword} />
      <Check label="18 yaşından büyüğüm" checked={ageConfirmed} onPress={() => setAgeConfirmed((value) => !value)} />
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
      <Pressable style={[styles.primary, (!acceptKvkk || !acceptTerms || !ageConfirmed) && styles.disabled]} disabled={!acceptKvkk || !acceptTerms || !ageConfirmed} onPress={() => void submit()}>
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
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center' },
  brandMark: { width: 62, height: 74 },
  brandName: { color: colors.ink, fontSize: 30, lineHeight: 30, fontWeight: '800' },
  brandMi: { color: colors.chili, fontSize: 24, lineHeight: 25, fontWeight: '800' },
  brandDomain: { color: colors.muted, fontSize: 10, letterSpacing: 1.5 },
  tagline: { color: colors.muted, textAlign: 'center' },
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
