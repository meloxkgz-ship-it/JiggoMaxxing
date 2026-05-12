import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { Image } from 'expo-image';
import { COLORS, LOOK_COVERS, LOOKS } from '@/lib/closet';
import { useT } from '@/lib/i18n';

function colorName(hex: string): string {
  return COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex;
}

export default function LookDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const look = LOOKS.find((l) => l.id === id);

  if (!look) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <Text style={styles.miss}>—</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: look.title }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('style.looks')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBg}>
          {LOOK_COVERS[look.id] ? (
            <Image source={LOOK_COVERS[look.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[look.palette[0], look.palette[1] ?? look.palette[0], look.palette[2] ?? look.palette[0]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.heroOverlay}>
            <Eyebrow>{t(`style.archetypes.${look.archetype}`)} · {t(`style.occasions.${look.occasion}`)}</Eyebrow>
            <Text style={styles.heroTitle}>{look.title}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Eyebrow>{t('style.matchColor')}</Eyebrow>
          <View style={styles.paletteRow}>
            {look.palette.map((c) => (
              <View key={c} style={styles.swatchTile}>
                <View style={[styles.swatch, { backgroundColor: c }]} />
                <Text style={styles.swatchName}>{colorName(c)}</Text>
                <Text style={styles.swatchHex}>{c.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Eyebrow>{t('style.lookCopyTitle')}</Eyebrow>
          <Text style={styles.body}>{look.description}</Text>
          <View style={styles.copyBox}>
            <Ionicons name="bulb-outline" size={16} color={colors.bronze} />
            <Text style={styles.copyText}>{look.copy}</Text>
          </View>
        </View>

        <Pressable
          style={styles.builderCta}
          onPress={() => router.replace({ pathname: '/builder', params: { archetype: look.archetype, occasion: look.occasion } } as any)}>
          <Ionicons name="sparkles" size={16} color={colors.textOnBronze} />
          <Text style={styles.builderCtaText}>{t('style.buildFromLook')}</Text>
        </Pressable>

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
  miss: { color: colors.textSecondary, padding: spacing.xl, fontFamily: type.family.sans },

  content: { padding: spacing.xl, gap: spacing.xl },

  heroBg: {
    borderRadius: radius.xl,
    aspectRatio: 16 / 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  heroOverlay: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: 'rgba(8,7,6,0.32)',
    justifyContent: 'flex-end',
    gap: 4,
  },
  heroTitle: {
    color: colors.textPrimary, fontFamily: type.family.sansBlack,
    fontSize: 32, lineHeight: 36, letterSpacing: type.letterSpacing.tighter,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  section: { gap: spacing.md },
  paletteRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  swatchTile: {
    flexBasis: '30%', flexGrow: 1,
    alignItems: 'center', gap: 6,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.hairline },
  swatchName: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 12 },
  swatchHex: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10, letterSpacing: 0.3 },

  body: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21 },
  copyBox: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    padding: spacing.lg, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.25)',
    backgroundColor: colors.bronzeOnBlack,
  },
  copyText: { color: colors.textPrimary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21, flex: 1 },

  builderCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: radius.pill,
    backgroundColor: colors.bronze, marginTop: spacing.lg,
  },
  builderCtaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
});
