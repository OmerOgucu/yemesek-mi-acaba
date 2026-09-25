import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ApiError, getJson } from '../../src/api/client';
import { useSelection } from '../../src/state/SelectionProvider';
import { colors } from '../../src/theme/theme';

type Item = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  evilScore: number;
  scoreLabel: string;
  reportCount: number;
};

export default function ListScreen() {
  const router = useRouter();
  const { setRestaurantId } = useSelection();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getJson<{ items: Item[] }>('/restaurants');
      setItems(data.items);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Liste alınamadı.');
    }
  }, []);

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
          <Text style={styles.kicker}>Kara liste</Text>
          <Text style={styles.title}>En kötüden başlar.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
  kicker: { color: colors.chili, letterSpacing: 1, fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 32, fontWeight: '700', marginTop: 4 },
  error: { color: colors.chili, marginTop: 8 },
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
