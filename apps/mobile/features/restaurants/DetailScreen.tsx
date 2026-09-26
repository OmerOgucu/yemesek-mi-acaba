import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError, getJson, mediaUrl } from '../api/client';
import { colors } from '../theme/theme';
import { useSelection } from './SelectionProvider';

type Report = {
  id: string;
  title: string;
  body: string;
  nickname: string;
  categoryLabel: string;
  severity: number;
  helpfulCount: number;
  photoUrls: string[];
  hasReceipt?: boolean;
  evidenceVerified: boolean;
};

type Detail = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  addressHint: string | null;
  cuisine: string | null;
  evilScore: number;
  scoreLabel: string;
  reportCount: number;
  reports: Report[];
};

export default function DetailScreen() {
  const { restaurantId } = useSelection();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!restaurantId) {
      setDetail(null);
      return;
    }
    setError('');
    try {
      setDetail(await getJson<Detail>(`/restaurants/${restaurantId}`));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Mekan alınamadı.');
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!restaurantId) {
    return <Text style={styles.empty}>Listeden bir mekan seç.</Text>;
  }
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!detail) return <Text style={styles.empty}>Açılıyor…</Text>;

  const place = [detail.addressHint, detail.district, detail.city].filter(Boolean).join(', ');

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.place}>{place}</Text>
      <Text style={styles.title}>{detail.name}</Text>
      <Text style={styles.score}>
        {detail.evilScore} · {detail.scoreLabel} · {detail.reportCount} şikayet
      </Text>
      {detail.cuisine ? <Text style={styles.meta}>{detail.cuisine}</Text> : null}
      {(detail.reports ?? []).length === 0 ? <Text style={styles.meta}>Henüz şikayet yok.</Text> : null}
      {(detail.reports ?? []).map((report) => (
        <View key={report.id} style={styles.card}>
          <Text style={styles.cardTitle}>{report.title}</Text>
          <Text style={styles.meta}>
            {report.categoryLabel} · {report.severity}/5 · {report.nickname} · {report.helpfulCount} yararlı
          </Text>
          <Text style={styles.body}>{report.body}</Text>
          <Text style={styles.badge}>Kanıtlı şikayet</Text>
          {report.evidenceVerified ? null : (
            <Text style={styles.meta}>Kanıt kullanıcı tarafından yüklendi, henüz incelenmedi.</Text>
          )}
          <View style={styles.row}>
            {(report.photoUrls ?? []).map((url) => (
              <Image key={url} source={{ uri: mediaUrl(url) }} style={styles.thumb} />
            ))}
            {report.hasReceipt ? <Text style={styles.meta}>Fiş yüklendi. Dosya herkese açık değil.</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 8 },
  empty: { padding: 16, color: colors.muted },
  error: { padding: 16, color: colors.chili },
  place: { color: colors.muted },
  title: { color: colors.ink, fontSize: 32, fontWeight: '700' },
  score: { color: colors.chili, fontWeight: '600' },
  meta: { color: colors.muted },
  card: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  body: { color: colors.ink, lineHeight: 22 },
  badge: { color: '#2f6b45', fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.line },
});
