import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '../auth/SessionProvider';
import { ApiError, postForm } from '../api/client';
import { useSelection } from '../restaurants/SelectionProvider';
import { colors } from '../theme/theme';

const CATEGORIES = [
  { id: 'FOOD_POISONING', label: 'Gıda zehirlenmesi şüphesi' },
  { id: 'HYGIENE', label: 'Hijyen' },
  { id: 'SCAM_PRICING', label: 'Şaibeli fiyat' },
  { id: 'FALSE_ADS', label: 'Yanıltıcı reklam' },
  { id: 'WRONG_OR_COLD', label: 'Yanlış veya soğuk sipariş' },
  { id: 'RUDE_SERVICE', label: 'Kaba hizmet' },
];

type Picked = { uri: string; name: string; type: string };

async function loadPicker() {
  try {
    return await import('expo-image-picker');
  } catch {
    throw new ApiError('Fotoğraf seçici bu kurulumda yok.', 0);
  }
}

async function pickImages(limit: number): Promise<Picked[]> {
  const ImagePicker = await loadPicker();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new ApiError('Fotoğraf seçmek için galeri izni gerekli.', 0);
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.7,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((asset, index) => ({
    uri: asset.uri,
    name: asset.fileName ?? `kanit-${index}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  }));
}

async function appendFile(form: FormData, field: string, file: Picked): Promise<void> {
  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    form.append(field, blob, file.name);
    return;
  }
  form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
}

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
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [receipt, setReceipt] = useState<Picked | null>(null);

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

  if (user.emailVerified !== true) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>E-posta doğrulaması gerekli</Text>
        <Text style={styles.hint}>Şikayet için kodu gir.</Text>
        <Pressable style={styles.primary} onPress={() => router.push('/dogrula')}>
          <Text style={styles.primaryText}>Doğrula</Text>
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
      if (!photos.length || !receipt) {
        setError('Fotoğraf ve fiş olmadan şikayet açılmaz.');
        return;
      }
      const payload = new FormData();
      payload.append('category', category);
      payload.append('severity', String(severity));
      payload.append('title', title);
      payload.append('body', body);
      for (const photo of photos) await appendFile(payload, 'photos', photo);
      await appendFile(payload, 'receipt', receipt);
      await postForm(`/restaurants/${restaurantId}/reports`, payload, true);
      setTitle('');
      setBody('');
      setPhotos([]);
      setReceipt(null);
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
      <Text style={styles.hint}>Fotoğraf ve fiş zorunlu. Fişte ad, telefon ve kart numarasını karala.</Text>
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
      <Pressable style={styles.ghost} onPress={() => void pickImages(3).then(setPhotos).catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Fotoğraf seçilemedi.'))}>
        <Text style={styles.ghostText}>Fotoğraf seç ({photos.length}/3)</Text>
      </Pressable>
      <View style={styles.row}>
        {photos.map((photo) => (
          <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.thumb} />
        ))}
      </View>
      <Pressable style={styles.ghost} onPress={() => void pickImages(1).then((files) => setReceipt(files[0] ?? null)).catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Fiş seçilemedi.'))}>
        <Text style={styles.ghostText}>{receipt ? 'Fiş seçildi' : 'Fiş veya fatura seç'}</Text>
      </Pressable>
      {receipt ? <Image source={{ uri: receipt.uri }} style={styles.thumb} /> : null}
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
      <Pressable style={[styles.primary, (!photos.length || !receipt || pending) && styles.disabled]} onPress={() => void submit()} disabled={pending || !photos.length || !receipt}>
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
  thumb: { width: 72, height: 72, borderRadius: 12 },
  disabled: { opacity: 0.4 },
});
