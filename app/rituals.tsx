import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useLanguage, useT } from '@/lib/i18n';
import { listRituals, RitualContext } from '@/lib/rituals';

const CONTEXT_ICONS: Record<RitualContext, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  morning: 'sunny-outline',
  reset: 'compass-outline',
  evening: 'moon-outline',
};

const CONTEXT_ORDER: RitualContext[] = ['morning', 'reset', 'evening'];

export default function RitualsScreen() {
  const t = useT();
  const { lang } = useLanguage();
  const all = listRituals(lang);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: t('rituals.title') }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('rituals.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1A1411', '#0E0B09']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Eyebrow>{t('rituals.eyebrow')}</Eyebrow>
          <Text style={styles.heroTitle}>{t('rituals.heroTitle')}</Text>
          <Text style={styles.heroBody}>{t('rituals.heroBody')}</Text>
        </LinearGradient>

        {CONTEXT_ORDER.map((ctx) => {
          const items = all.filter((r) => r.context === ctx);
          if (items.length === 0) return null;
          return (
            <View key={ctx} style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={styles.sectionIcon}>
                  <Ionicons name={CONTEXT_ICONS[ctx]} size={14} color={colors.bronze} />
                </View>
                <Eyebrow>{t(`rituals.context.${ctx}`)}</Eyebrow>
              </View>
              <View style={{ gap: spacing.md }}>
                {items.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardTitle}>{r.title}</Text>
                      <Text style={styles.cardDuration}>{r.duration}</Text>
                    </View>
                    <Text style={styles.cardIntention}>{r.intention}</Text>
                    <View style={styles.steps}>
                      {r.steps.map((s, i) => (
                        <View key={i} style={styles.stepRow}>
                          <View style={styles.stepDot} />
                          <Text style={styles.stepText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Soft Pro CTA — sits below the curated free library. Editorial
            framing: the free set is real; Pro adds a fresh monthly drop.
            One tap → /upgrade. */}
        <Pressable
          style={styles.proCta}
          onPress={() => router.push('/upgrade' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('rituals.proCtaButton')}>
          <View style={styles.proCtaIcon}>
            <Ionicons name="sparkles" size={14} color={colors.textOnBronze} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.proCtaTitle}>{t('rituals.proCtaTitle')}</Text>
            <Text style={styles.proCtaBody}>{t('rituals.proCtaBody')}</Text>
          </View>
          <View style={styles.proCtaButton}>
            <Text style={styles.proCtaButtonText}>{t('rituals.proCtaButton')}</Text>
          </View>
        </Pressable>

        <Text style={styles.fine}>{t('rituals.fine')}</Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.3, textTransform: 'uppercase' },

  content: { padding: spacing.xl, gap: spacing.xl },

  hero: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.22)',
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: type.letterSpacing.tighter,
    marginTop: spacing.sm,
  },
  heroBody: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 14,
    lineHeight: 21,
  },

  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(176,138,90,0.10)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 18,
    letterSpacing: type.letterSpacing.tight,
  },
  cardDuration: {
    color: colors.bronze,
    fontFamily: type.family.sansMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardIntention: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontStyle: 'italic',
    fontSize: 13.5,
    lineHeight: 20,
  },

  steps: { gap: 8, marginTop: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: colors.bronze,
  },
  stepText: {
    color: colors.textPrimary,
    fontFamily: type.family.sansMedium,
    fontSize: 13.5,
    flex: 1,
  },

  fine: {
    color: colors.textTertiary,
    fontFamily: type.family.sans,
    fontSize: 11.5,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },

  proCta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(176,138,90,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.35)',
  },
  proCtaIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.bronze,
    alignItems: 'center', justifyContent: 'center',
  },
  proCtaTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13.5 },
  proCtaBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12, lineHeight: 17, marginTop: 2 },
  proCtaButton: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
  },
  proCtaButtonText: {
    color: colors.textOnBronze,
    fontFamily: type.family.sansSemi,
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
});
