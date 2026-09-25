import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { getDocument } from '@yemesek/legal';
import { colors } from '../theme/theme';

export default function LegalScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const document = slug ? getDocument(slug) : undefined;

  if (!document) return <Text style={styles.missing}>Bu metin yok.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.kicker}>{document.updated}</Text>
      <Text style={styles.title}>{document.title}</Text>
      <Text style={styles.summary}>{document.summary}</Text>
      {document.sections.map((section) => (
        <ViewSection key={section.heading} heading={section.heading} paragraphs={section.paragraphs} />
      ))}
    </ScrollView>
  );
}

function ViewSection({ heading, paragraphs }: { heading: string; paragraphs: string[] }) {
  return (
    <>
      <Text style={styles.heading}>{heading}</Text>
      {paragraphs.map((paragraph) => (
        <Text key={paragraph} style={styles.body}>
          {paragraph}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 8 },
  missing: { padding: 16, color: colors.muted },
  kicker: { color: colors.chili, fontSize: 12, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  summary: { color: colors.muted },
  heading: { marginTop: 12, fontSize: 18, fontWeight: '700', color: colors.ink },
  body: { color: colors.ink, lineHeight: 22 },
});
