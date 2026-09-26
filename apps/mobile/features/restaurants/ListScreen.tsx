import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ApiError, getJson } from '../api/client';
import { colors } from '../theme/theme';
import { useSelection } from './SelectionProvider';

type Item = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  evilScore: number;
  scoreLabel: string;
  status?: 'OPEN' | 'CLOSED' | 'MOVED';
  reportCount: number;
};

type Location = { city: string; districts: string[] };

export default function ListScreen() {
  const router = useRouter();
  const { setRestaurantId } = useSelection();
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (district) params.set('district', district);
      const query = params.toString();
      const data = await getJson<{ items?: Item[]; locations?: Location[] }>(`/restaurants${query ? `?${query}` : ''}`);
      setItems(data.items ?? []);
      setLocations(data.locations ?? []);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Liste alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [city, district]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load().finally(() => setRefreshing(false));
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.tagline}>Mekanları keşfet — kararını kolaylaştır</Text>
          <Text style={styles.meta}>Gönüllü topluluk hizmeti. Kanıtlı şikayet. Şirket değil.</Text>
          <Text style={styles.kicker}>Kara liste</Text>
          <Text style={styles.title}>En kötüden başlar.</Text>
          {loading && items.length === 0 ? <Text style={styles.meta}>Liste kaynıyor…</Text> : null}
          {!loading && !error && items.length === 0 ? <Text style={styles.meta}>Bu süzgeçte mekan yok.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.add} accessibilityLabel="Mekan ekle" onPress={() => router.push('/mekan-ekle')}>
            <Text style={styles.addText}>Mekan ekle</Text>
          </Pressable>
          <View style={styles.filters}>
            <Pressable
              style={city ? styles.chip : styles.chipOn}
              onPress={() => {
                setCity('');
                setDistrict('');
              }}
            >
              <Text style={city ? styles.chipText : styles.chipOnText}>Tüm şehirler</Text>
            </Pressable>
            {locations.map((location) => (
              <Pressable
                key={location.city}
                style={city === location.city ? styles.chipOn : styles.chip}
                onPress={() => {
                  setCity(location.city);
                  setDistrict('');
                }}
              >
                <Text style={city === location.city ? styles.chipOnText : styles.chipText}>{location.city}</Text>
              </Pressable>
            ))}
          </View>
          {city ? (
            <View style={styles.filters}>
              {(locations.find((location) => location.city === city)?.districts ?? []).map((name) => (
                <Pressable
                  key={name}
                  style={district === name ? styles.chipOn : styles.chip}
                  onPress={() => setDistrict(district === name ? '' : name)}
                >
                  <Text style={district === name ? styles.chipOnText : styles.chipText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item, index }) => (
        <Pressable
          style={styles.card}
          onPress={() => {
            setRestaurantId(item.id);
            router.push('/mekan');
          }}
        >
          <Text style={styles.rank}>{index + 1}</Text>
          <View style={styles.seal}>
            <Text style={styles.score}>{item.evilScore}</Text>
            <Text style={styles.label}>{item.scoreLabel}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {[item.district, item.city].filter(Boolean).join(', ')} · {item.reportCount} şikayet
              {item.status === 'CLOSED' ? ' · Kapalı' : item.status === 'MOVED' ? ' · Taşındı' : ''}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  header: { marginBottom: 8 },
  tagline: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  kicker: { color: colors.chili, letterSpacing: 1, fontSize: 12, textTransform: 'uppercase', marginTop: 10 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '700', marginTop: 4 },
  error: { color: colors.chili, marginTop: 8 },
  add: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: colors.chili, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  addText: { color: colors.card, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.chili, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: colors.ink, fontSize: 12 },
  chipOnText: { color: colors.card, fontSize: 12 },
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  rank: { width: 24, color: colors.muted, fontSize: 18 },
  seal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.chili,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { color: colors.chili, fontSize: 18, fontWeight: '700' },
  label: { color: colors.chili, fontSize: 9, textTransform: 'uppercase' },
  copy: { flex: 1 },
  name: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  meta: { color: colors.muted, marginTop: 4 },
});
