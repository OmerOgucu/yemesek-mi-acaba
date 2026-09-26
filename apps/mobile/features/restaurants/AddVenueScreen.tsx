import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, postJson } from '../api/client';
import { useSession } from '../auth/SessionProvider';
import { colors } from '../theme/theme';

export default function AddVenueScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [error, setError] = useState('');

  if (!user) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Mekan eklemek için giriş</Text>
        <Pressable style={styles.primary} onPress={() => router.push('/giris')}>
          <Text style={styles.primaryText}>Giriş</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={() => router.push('/kayit')}>
          <Text style={styles.ghostText}>Kayıt</Text>
        </Pressable>
      </View>
    );
  }

  if (user.emailVerified !== true) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Önce e-postanı doğrula</Text>
        <Pressable style={styles.primary} onPress={() => router.push('/dogrula')}>
          <Text style={styles.primaryText}>Doğrula</Text>
        </Pressable>
      </View>
    );
  }

  async function submit() {
    setError('');
    try {
      if (city.trim().length < 2 || district.trim().length < 2) {
        setError('Şehir ve ilçe zorunlu.');
        return;
      }
      await postJson('/restaurants', { name, city, district }, true);
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Mekan eklenemedi.');
    }
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Mekan ekle</Text>
      <Text style={styles.hint}>Şehir ve ilçe zorunlu. Aynı ikili yeniden yazılırsa mevcut konuma bağlanır.</Text>
      <TextInput style={styles.input} placeholder="Mekan adı" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Şehir" value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="İlçe" value={district} onChangeText={setDistrict} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={() => void submit()}>
        <Text style={styles.primaryText}>Kaydet</Text>
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
});
