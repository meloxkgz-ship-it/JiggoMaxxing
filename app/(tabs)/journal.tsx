import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useT } from '@/lib/i18n';
import { deleteEntry, getStreak, listEntries, relativeDate } from '@/lib/journal';
import { JournalEntry } from '@/lib/types';

const MOOD_COLORS: Record<string, string> = {
  sharp:     '#7E9E7A',
  even:      '#B08A5A',
  foggy:     '#5C5C5A',
  low:       '#B0584F',
  wired:     '#C6A16A',
  motivated: '#8FA078',
  restless:  '#7A6E92',
};

export default function JournalScreen() {
  const t = useT();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setEntries(await listEntries());
    setStreak(await getStreak());
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const weights = entries.filter((e) => typeof e.weightKg === 'number').slice(0, 14).reverse();
  const latest = entries[0];
  const previous = entries[1];
  const delta = latest?.weightKg && previous?.weightKg ? (latest.weightKg - previous.weightKg).toFixed(1) : null;

  // Weekly mood
  const last7 = entries.slice(0, 7);
  const moodCounts = last7.reduce<Record<string, number>>((acc, e) => {
    if (e.mood) acc[e.mood] = (acc[e.mood] ?? 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const confirmDelete = (e: JournalEntry) => {
    Alert.alert(t('journal.delete'), e.notes ? `"${e.notes.slice(0, 60)}…"` : '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          await deleteEntry(e.id);
          setEntries(await listEntries());
          setStreak(await getStreak());
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow={t('journal.eyebrow')}
        title={t('journal.title')}
        subtitle={t('journal.subtitle')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.bronze} />}>
        <Card variant="elevated" style={{ gap: spacing.md }}>
          <View style={styles.metaRow}>
            <Eyebrow>{t('journal.weightLabel')}</Eyebrow>
            {delta && (
              <Text style={Number(delta) <= 0 ? styles.deltaPos : styles.deltaNeg}>
                {delta} {t('common.units_kg')}
              </Text>
            )}
          </View>
          {weights.length === 0 ? (
            <Text style={styles.emptySmall}>{t('journal.empty')}</Text>
          ) : (
            <View style={styles.spark}>
              {weights.map((e, i) => {
                const vals = weights.map((x) => x.weightKg!).filter(Boolean);
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const range = Math.max(0.4, max - min);
                const h = ((e.weightKg! - min) / range) * 56 + 8;
                return (
                  <View
                    key={e.id}
                    style={[
                      styles.bar,
                      { height: h, backgroundColor: i === weights.length - 1 ? colors.bronze : colors.surfaceMuted },
                    ]}
                  />
                );
              })}
            </View>
          )}
          <View style={styles.statsRow}>
            <Stat label={t('journal.current')} value={latest?.weightKg?.toFixed(1) ?? '—'} unit={t('common.units_kg')} />
            <Stat
              label={t('journal.avg7d')}
              value={
                entries.slice(0, 7).filter((e) => e.weightKg).length
                  ? (
                      entries.slice(0, 7).filter((e) => e.weightKg).reduce((acc, e) => acc + e.weightKg!, 0) /
                      entries.slice(0, 7).filter((e) => e.weightKg).length
                    ).toFixed(1)
                  : '—'
              }
              unit={t('common.units_kg')}
            />
            <Stat label={t('journal.streak')} value={streak.toString()} unit="" />
          </View>
        </Card>

        {last7.length >= 3 && topMood && (
          <View style={styles.reviewCard}>
            <Eyebrow>{t('journal.review.title')}</Eyebrow>
            <Text style={styles.reviewBody}>
              {t('journal.review.body', {
                count: last7.length,
                mood: t(`journal.moods.${topMood}`),
              })}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Eyebrow>{t('journal.entriesTitle')}</Eyebrow>
            <Pressable hitSlop={8} onPress={() => router.push('/journal-entry' as any)}>
              <Ionicons name="add-circle" size={26} color={colors.bronze} />
            </Pressable>
          </View>

          {entries.length === 0 && (
            <Card variant="outline" style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="leaf-outline" size={22} color={colors.bronze} />
              </View>
              <Text style={styles.emptyTitle}>{t('journal.empty')}</Text>
              <Text style={styles.emptyBody}>{t('journal.emptyBody')}</Text>
              <Pressable
                style={styles.emptyCta}
                onPress={() => router.push('/journal-entry' as any)}>
                <Ionicons name="add" size={14} color={colors.textOnBronze} />
                <Text style={styles.emptyCtaText}>{t('journal.newEntry')}</Text>
              </Pressable>
            </Card>
          )}

          {entries.map((e) => (
            <Card key={e.id} variant="outline" style={styles.entry}>
              <View style={styles.entryHead}>
                <Text style={styles.entryDate}>{relativeDate(e.date)}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {e.mood && (
                    <View style={[styles.moodPill, { borderColor: MOOD_COLORS[e.mood] }]}>
                      <Text style={[styles.moodText, { color: MOOD_COLORS[e.mood] }]}>{t(`journal.moods.${e.mood}`)}</Text>
                    </View>
                  )}
                  <Pressable hitSlop={8} onPress={() => confirmDelete(e)}>
                    <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
                  </Pressable>
                </View>
              </View>
              {(e.weightKg || e.sleepHours) && (
                <View style={styles.entryStats}>
                  {e.weightKg && (
                    <View style={styles.statChip}>
                      <Ionicons name="scale-outline" size={12} color={colors.bronze} />
                      <Text style={styles.statChipText}>{e.weightKg.toFixed(1)} {t('common.units_kg')}</Text>
                    </View>
                  )}
                  {e.sleepHours && (
                    <View style={styles.statChip}>
                      <Ionicons name="moon-outline" size={12} color={colors.bronze} />
                      <Text style={styles.statChipText}>{e.sleepHours} {t('common.units_h')}</Text>
                    </View>
                  )}
                </View>
              )}
              {e.notes ? <Text style={styles.entryNote}>{e.notes}</Text> : null}
            </Card>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={styles.statValue}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deltaPos: { color: colors.positive, fontFamily: type.family.sansSemi, fontSize: 13 },
  deltaNeg: { color: colors.danger, fontFamily: type.family.sansSemi, fontSize: 13 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70, marginTop: spacing.sm },
  bar: { flex: 1, borderRadius: 2, minHeight: 4 },

  statsRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  stat: { flex: 1, gap: 4 },
  statLabel: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 22, letterSpacing: type.letterSpacing.tight },
  statUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, marginLeft: 3, marginBottom: 4 },
  emptySmall: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 12, paddingVertical: spacing.md },

  reviewCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bronzeOnBlack,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.25)',
    gap: 6,
  },
  reviewBody: { color: colors.textPrimary, fontFamily: type.family.sans, fontSize: 13.5, lineHeight: 20 },

  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  empty: { gap: spacing.sm, alignItems: 'flex-start' },
  emptyIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(176,138,90,0.10)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 15 },
  emptyBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, lineHeight: 19 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 9, backgroundColor: colors.bronze, borderRadius: radius.pill, marginTop: spacing.sm },
  emptyCtaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 12 },

  entry: { gap: spacing.sm },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryDate: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },
  moodPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  moodText: { fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase' },

  entryStats: { flexDirection: 'row', gap: 8 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.pill, backgroundColor: colors.bronzeOnBlack,
  },
  statChipText: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 11.5 },
  entryNote: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13.5, lineHeight: 20 },
});
