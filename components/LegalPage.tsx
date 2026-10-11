import { Fragment } from 'react';
import { ScrollView, View, Text, StyleSheet, Linking, StyleProp, TextStyle } from 'react-native';
import { colors, shadows } from '../lib/theme';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

const EMAIL = /([\w.+-]+@brulogger\.com)/;

/** Text with any brulogger.com email address made into a mailto link. */
function Prose({ children, style }: { children: string; style: StyleProp<TextStyle> }) {
  return (
    <Text style={style} selectable>
      {children.split(EMAIL).map((part, i) =>
        EMAIL.test(part) ? (
          <Text key={i} style={styles.link} role="link" onPress={() => Linking.openURL(`mailto:${part}`)}>
            {part}
          </Text>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </Text>
  );
}

/** The privacy policy and terms: a title, a last-updated date, an introduction and sections. */
export default function LegalPage({
  title, updated, intro, sections,
}: { title: string; updated: string; intro: string[]; sections: LegalSection[] }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title} role="heading">{title}</Text>
        <Text style={styles.updated}>Last updated {updated}</Text>
        {intro.map((p) => <Prose key={p} style={styles.paragraph}>{p}</Prose>)}
        {sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.heading} role="heading">{s.heading}</Text>
            {s.paragraphs?.map((p) => <Prose key={p} style={styles.paragraph}>{p}</Prose>)}
            {s.bullets?.map((b) => (
              <View key={b} style={styles.bullet}>
                <Text style={styles.bulletMark} aria-hidden>•</Text>
                <Prose style={[styles.paragraph, styles.bulletText]}>{b}</Prose>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    ...shadows.card,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  updated: { fontSize: 13, color: colors.textLight, marginBottom: 16 },
  section: { marginTop: 20 },
  heading: { fontSize: 17, fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  paragraph: { fontSize: 15, lineHeight: 23, color: colors.textMuted, marginBottom: 10 },
  bullet: { flexDirection: 'row', gap: 8 },
  bulletMark: { fontSize: 15, lineHeight: 23, color: colors.primary },
  bulletText: { flex: 1 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
});
