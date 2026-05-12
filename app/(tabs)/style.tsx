import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Eyebrow } from '@/components/Eyebrow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';

const FILTERS = ['All', 'Tailored', 'Casual', 'Street', 'Layered'];

// silhouette placeholders — outfit photography to be added later
const FITS = [
  { id: '1', label: 'Charcoal · cream', tone: '#1A1815' },
  { id: '2', label: 'Tan · forest',     tone: '#171A14' },
  { id: '3', label: 'Black · taupe',    tone: '#161616' },
  { id: '4', label: 'Olive · stone',    tone: '#191A14' },
  { id: '5', label: 'Cognac · ivory',   tone: '#1B1612' },
  { id: '6', label: 'Slate · navy',     tone: '#13161A' },
];

export default function StyleScreen() {
  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow="Style Aura"
        title="Fit log"
        subtitle="Your outfit archive. Patterns surface, not scores."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {FILTERS.map((f, i) => (
            <Pressable key={f} style={[styles.chip, i === 0 && styles.chipActive]}>
              <Text style={[styles.chipText, i === 0 && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {FITS.map((f) => (
            <View key={f.id} style={styles.fitCard}>
              <View style={[styles.fitImage, { backgroundColor: f.tone }]}>
                <Ionicons name="person" size={56} color="#2A2925" />
              </View>
              <Text style={styles.fitLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.addBtn}>
          <Ionicons name="add" size={18} color={colors.textOnBronze} />
          <Text style={styles.addText}>Log a fit</Text>
        </Pressable>

        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingTop: spacing.md, paddingBottom: spacing.lg },

  chipsRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  chipText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.3 },
  chipTextActive: { color: colors.textOnBronze },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  fitCard: { flexBasis: '47%', flexGrow: 1, gap: 8 },
  fitImage: {
    aspectRatio: 0.78,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitLabel: {
    color: colors.textSecondary,
    fontFamily: type.family.sansMedium,
    fontSize: 11.5,
    letterSpacing: 0.3,
    paddingLeft: 2,
  },

  addBtn: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
  },
  addText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
});
