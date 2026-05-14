import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { Achievement, AchievementTier, computeAchievements } from '@/lib/achievements';
import { useT } from '@/lib/i18n';

const TIER_ORDER: AchievementTier[] = ['start', 'build', 'depth'];

export default function AchievementsScreen() {
  const t = useT();
  const [items, setItems] = useState<Achievement[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      computeAchievements().then((a) => { if (alive) setItems(a); });
      return () => { alive = false; };
    }, []),
  );

  const earnedCount = items.filter((a) => a.earned).length;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: t('achievements.title') }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('achievements.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Eyebrow>{t('achievements.eyebrow')}</Eyebrow>
          <Text style={styles.introTitle}>
            {items.length > 0
              ? t('achievements.count', { earned: earnedCount, total: items.length })
              : t('achievements.title')}
          </Text>
          <Text style={styles.introBody}>{t('achievements.body')}</Text>
        </View>

        {TIER_ORDER.map((tier) => {
          const group = items.filter((a) => a.tier === tier);
          if (group.length === 0) return null;
          return (
            <View key={tier} style={styles.section}>
              <Eyebrow>{t(`achievements.tiers.${tier}`)}</Eyebrow>
              <View style={{ gap: spacing.sm }}>
                {group.map((a) => (
                  <View
                    key={a.id}
                    style={[styles.card, a.earned ? styles.cardEarned : styles.cardLocked]}>
                    <View style={[styles.glyph, a.earned ? styles.glyphEarned : styles.glyphLocked]}>
                      <Ionicons
                        name={a.earned ? 'checkmark' : 'ellipse-outline'}
                        size={a.earned ? 16 : 12}
                        color={a.earned ? colors.textOnBronze : colors.textTertiary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, !a.earned && styles.cardTitleLocked]}>
                        {t(`achievements.items.${a.id}.title`)}
                      </Text>
                      <Text style={styles.cardBody}>
                        {t(`achievements.items.${a.id}.body`)}
                      </Text>
                    </View>
                    {!a.earned && a.progress && (
                      <Text style={styles.progress}>{a.progress}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Text style={styles.fine}>{t('achievements.fine')}</Text>
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

  intro: { gap: spacing.sm },
  introTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: type.letterSpacing.tighter,
    marginTop: spacing.sm,
  },
  introBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21 },

  section: { gap: spacing.md },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardEarned: {
    backgroundColor: 'rgba(176,138,90,0.07)',
    borderColor: 'rgba(176,138,90,0.28)',
  },
  cardLocked: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
  },
  glyph: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  glyphEarned: { backgroundColor: colors.bronze },
  glyphLocked: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  cardTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },
  cardTitleLocked: { color: colors.textSecondary },
  cardBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  progress: {
    color: colors.bronze,
    fontFamily: type.family.sansBlack,
    fontSize: 12,
    letterSpacing: 0.4,
  },

  fine: {
    color: colors.textTertiary,
    fontFamily: type.family.sans,
    fontSize: 11.5,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
});
