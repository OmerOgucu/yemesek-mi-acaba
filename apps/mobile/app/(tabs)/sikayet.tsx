import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, postJson } from '../../src/api/client';
import { useSelection } from '../../src/state/SelectionProvider';
import { useSession } from '../../src/state/SessionProvider';
import { colors } from '../../src/theme/theme';

const CATEGORIES = [
  { id: 'FOOD_POISONING', label: 'Gıda zehirlenmesi şüphesi' },
  { id: 'HYGIENE', label: 'Hijyen' },
  { id: 'SCAM_PRICING', label: 'Şaibeli fiyat' },
  { id: 'FALSE_ADS', label: 'Yanıltıcı reklam' },
  { id: 'WRONG_OR_COLD', label: 'Yanlış veya soğuk sipariş' },
  { id: 'RUDE_SERVICE', label: 'Kaba hizmet' },
];

export default function ReportScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { restaurantId } = useSelection();
  const [category, setCategory] = useState('HYGIENE');
  const [severity, setSeverity] = useState(3);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (!user) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Şikayet için giriş</Text>
        <Pressable style={styles.primary} onPress={() => router.push('/giris')}>
          <Text style={styles.primaryText}>Giriş</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={() => router.push('/kayit')}>
          <Text style={styles.ghostText}>Kayıt</Text>
        </Pressable>
      </View>
    );
  }

  if (!restaurantId) {
    return <Text style={styles.hint}>Önce listeden bir mekan seç.</Text>;
  }

  async function submit() {
    if (!restaurantId) return;
    setPending(true);
    setError('');
    setDone(false);
    try {
      await postJson(
        `/restaurants/${restaurantId}/reports`,
        { category, severity, title, body },
        true,
      );
      setTitle('');
      setBody('');
      setDone(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Gönderilemedi.');
    } finally {
      setPending(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Şikayet bırak</Text>
      <Text style={styles.hint}>Kişi adı, telefon ve kapı numarası yazma.</Text>
      <View style={styles.row}>
        {CATEGORIES.map((item) => (
          <Pressable key={item.id} onPress={() => setCategory(item.id)} style={category === item.id ? styles.chipOn : styles.chip}>
            <Text style={category === item.id ? styles.chipOnText : styles.chipText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setSeverity(value)} style={severity === value ? styles.chipOn : styles.chip}>
            <Text style={severity === value ? styles.chipOnText : styles.chipText}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Başlık" value={title} onChangeText={setTitle} />
      <TextInput
        style={[styles.input, styles.area]}
        placeholder="Ne oldu?"
        value={body}
        onChangeText={setBody}
        multiline
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {done ? <Text style={styles.ok}>Şikayet düştü.</Text> : null}
      <Pressable style={styles.primary} onPress={() => void submit()} disabled={pending}>
        <Text style={styles.primaryText}>{pending ? 'Gönderiliyor…' : 'Şikayeti bırak'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  hint: { color: colors.muted, paddingHorizontal: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.chili, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: colors.ink, fontSize: 12 },
  chipOnText: { color: colors.card, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    color: colors.ink,
  },
  area: { minHeight: 120, textAlignVertical: 'top' },
  primary: { backgroundColor: colors.chili, borderRadius: 999, padding: 14, alignItems: 'center' },
  primaryText: { color: colors.card, fontWeight: '700' },
  ghost: { borderWidth: 1, borderColor: colors.ink, borderRadius: 999, padding: 14, alignItems: 'center' },
  ghostText: { color: colors.ink, fontWeight: '700' },
  error: { color: colors.chili },
  ok: { color: '#2f6b45' },
});
