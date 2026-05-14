import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { PRO_ENABLED } from '@/lib/featureFlags';
import { useT } from '@/lib/i18n';
import { lastNDates } from '@/lib/dates';
import { getStreak, listEntries, todayKey } from '@/lib/journal';
import { getActivePlan, getCompletion } from '@/lib/plan';
import { getNudgeStreak } from '@/lib/nudge';
import { listScans } from '@/lib/scan';
import { JournalEntry, ScanResult } from '@/lib/types';

/** Mirror of journal.tsx MOOD_COLORS — kept local so insights doesn't
 *  reach across screens, and so adding moods stays a one-line change. */
const MOOD_COLORS: Record<string, string> = {
  sharp:     '#7E9E7A',
  even:      '#B08A5A',
  foggy:     '#5C5C5A',
  low:       '#B0584F',
  wired:     '#C6A16A',
  motivated: '#8FA078',
  restless:  '#7A6E92',
};


export default function InsightsScreen() {
  const t = useT();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [nudgeStreak, setNudgeStreak] = useState(0);
  const [journalStreak, setJournalStreak] = useState(0);
  const [planRatios, setPlanRatios] = useState<number[]>([]);
  const [topMood, setTopMood] = useState<string | null>(null);
  const [bestDim, setBestDim] = useState<{ name: string; v: number } | null>(null);
  const [weakDim, setWeakDim] = useState<{ name: string; v: number } | null>(null);
  // Selection lives above the effect so refreshing on focus can clamp it.
  const [selectedScanIdx, setSelectedScanIdx] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [scList, jeList, ns, js, comp, plan] = await Promise.all([
      listScans(),
      listEntries(),
      getNudgeStreak(),
      getStreak(),
      getCompletion(),
      getActivePlan(),
    ]);
    setScans(scList);
    setEntries(jeList);
    setNudgeStreak(ns);
    setJournalStreak(js);
    // Clamp drill-down so we don't reference a deleted scan after focus.
    const visible = Math.min(scList.length, 10);
    setSelectedScanIdx((idx) => (idx != null && idx < visible ? idx : null));
    const dates = lastNDates(28);
    const total = Math.max(1, plan.length);
    setPlanRatios(dates.map((d) => Math.min(1, (comp[d] ?? []).length / total)));

    // Top mood from last 30 entries
    const counts: Record<string, number> = {};
    for (const e of jeList.slice(0, 30)) {
      if (e.mood) counts[e.mood] = (counts[e.mood] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    setTopMood(top ?? null);

    // Best/worst dimension across last 5 scans (averaged)
    const dimAgg: Record<string, number[]> = {};
    for (const s of scList.slice(0, 5)) {
      for (const [k, v] of Object.entries(s.dimensions)) {
        (dimAgg[k] ??= []).push(v);
      }
    }
    const avgs = Object.entries(dimAgg).map(([k, vs]) => ({
      name: k,
      v: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
    }));
    if (avgs.length) {
      avgs.sort((a, b) => b.v - a.v);
      setBestDim(avgs[0]);
      setWeakDim(avgs[avgs.length - 1]);
    } else {
      // No scans → drop stale dim cards.
      setBestDim(null);
      setWeakDim(null);
    }
  }, []);

  // Re-fetch on focus, not just on mount. Without this, deleting a scan from
  // scan-detail leaves stale bars + a drill-down pointing at a missing id.
  useFocusEffect(
    useCallback(() => { load(); }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await load();
    setRefreshing(false);
  };

  const recentScans = scans.slice(0, 10).reverse();
  const recentScores = recentScans.map((s) => s.overall);
  const last14Entries = lastNDates(14).map((d) => entries.filter((e) => e.date === d).length);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: t('home.insights') }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('home.insights')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.bronze}
          />
        }>
        {/* Streaks */}
        <View style={styles.row}>
          <BigStat label={t('home.statsNudge')} value={nudgeStreak.toString()} unit={t('home.statsDays')} />
          <BigStat label={t('home.statsJournal')} value={journalStreak.toString()} unit={t('home.statsDays')} />
        </View>

        {/* Milestones entry — quiet row linking to the achievements ledger */}
        <Pressable
          style={styles.milestonesRow}
          onPress={() => router.push('/achievements' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('achievements.seeAll')}>
          <View style={styles.milestonesGlyph}>
            <Ionicons name="ribbon-outline" size={15} color={colors.bronze} />
          </View>
          <Text style={styles.milestonesText}>{t('achievements.seeAll')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>

        {/* Edge over time */}
        <Section title={t('home.insightsTrend')}>
          {recentScores.length === 0 ? (
            <EmptyHint text={t('home.insightsEmpty')} />
          ) : (
            <>
              <View style={styles.lineRow}>
                {recentScores.map((v, i) => {
                  const min = Math.min(...recentScores);
                  const max = Math.max(...recentScores);
                  const range = Math.max(8, max - min);
                  const h = ((v - min) / range) * 70 + 8;
                  const isSelected = selectedScanIdx === i;
                  return (
                    <Pressable
                      key={i}
                      style={styles.lineCol}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setSelectedScanIdx(isSelected ? null : i);
                      }}>
                      <Text style={[styles.lineVal, isSelected && { color: colors.bronze }]}>{v}</Text>
                      <View
                        style={[
                          styles.lineBar,
                          {
                            height: h,
                            backgroundColor:
                              isSelected ? colors.bronzeBright
                              : i === recentScores.length - 1 ? colors.bronze
                              : colors.surfaceMuted,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
              {selectedScanIdx != null && recentScans[selectedScanIdx] && (
                <ScanDetail
                  scan={recentScans[selectedScanIdx]}
                  onOpen={() =>
                    router.push({
                      pathname: '/scan-detail',
                      params: { id: recentScans[selectedScanIdx].id },
                    } as any)
                  }
                  t={t}
                />
              )}
            </>
          )}
        </Section>

        {/* Plan adherence */}
        <Section title={t('home.insightsAdherence')}>
          <View style={styles.heatRow}>
            {planRatios.map((r, i) => {
              const alpha = r === 0 ? 0.12 : 0.3 + r * 0.7;
              return (
                <View
                  key={i}
                  style={[
                    styles.heatCell,
                    { backgroundColor: r === 0 ? colors.surfaceMuted : `rgba(176,138,90,${alpha})` },
                  ]}
                />
              );
            })}
          </View>
        </Section>

        {/* Journal entry count */}
        <Section title={t('home.insightsJournal')}>
          <View style={styles.lineRow}>
            {last14Entries.map((cnt, i) => {
              const h = Math.min(64, cnt * 22) + 4;
              return (
                <View key={i} style={styles.lineCol}>
                  <View style={[styles.lineBar, { height: h, backgroundColor: cnt > 0 ? colors.bronze : colors.surfaceMuted }]} />
                </View>
              );
            })}
          </View>
        </Section>

        {/* Dimensions */}
        {bestDim && weakDim && (
          <>
            <View style={styles.row}>
              <View style={[styles.miniCard, styles.miniCardGood]}>
                <Eyebrow>{t('home.insightsBestDim')}</Eyebrow>
                <Text style={styles.miniName}>{t(`scan.dimensions.${bestDim.name}` as any)}</Text>
                <Text style={styles.miniValue}>{bestDim.v}</Text>
              </View>
              <View style={[styles.miniCard, styles.miniCardWatch]}>
                <Eyebrow>{t('home.insightsWeakestDim')}</Eyebrow>
                <Text style={styles.miniName}>{t(`scan.dimensions.${weakDim.name}` as any)}</Text>
                <Text style={styles.miniValue}>{weakDim.v}</Text>
              </View>
            </View>
            <Pressable
              style={styles.askCoachBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                const dimLabel = t(`scan.dimensions.${weakDim.name}` as any);
                router.push({
                  pathname: '/(tabs)/coach',
                  params: { primed: t('home.askCoachPrimed', { dim: dimLabel }) },
                } as any);
              }}>
              <Ionicons name="sparkles-outline" size={14} color={colors.textOnBronze} />
              <Text style={styles.askCoachText}>
                {t('home.askCoachAboutDim', {
                  dim: t(`scan.dimensions.${weakDim.name}` as any),
                })}
              </Text>
            </Pressable>
          </>
        )}

        {/* Top mood + 14-day mood ribbon — color stripe per day for a
            calm, glanceable trajectory view. No numbers, just texture. */}
        {topMood && (
          <View style={styles.moodCard}>
            <Eyebrow>{t('home.insightsTopMood')}</Eyebrow>
            <Text style={styles.moodValue}>{t(`journal.moods.${topMood}` as any)}</Text>
            <View style={styles.moodRibbon}>
              {lastNDates(14).map((d) => {
                const e = entries.find((x) => x.date === d);
                const color = e?.mood
                  ? (MOOD_COLORS[e.mood] ?? colors.surfaceMuted)
                  : colors.surfaceMuted;
                return <View key={d} style={[styles.moodRibbonCell, { backgroundColor: color }]} />;
              })}
            </View>
          </View>
        )}

        {/* Soft Pro CTA — gated behind PRO_ENABLED. Hidden for the v1.0
            BYO-key-only submit. */}
        {PRO_ENABLED && (
          <Pressable
            style={styles.proCta}
            onPress={() => router.push('/upgrade' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('home.insightsProButton')}>
            <View style={styles.proCtaIcon}>
              <Ionicons name="sparkles" size={14} color={colors.textOnBronze} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proCtaTitle}>{t('home.insightsProTitle')}</Text>
              <Text style={styles.proCtaBody}>{t('home.insightsProBody')}</Text>
            </View>
            <View style={styles.proCtaBtn}>
              <Text style={styles.proCtaBtnText}>{t('home.insightsProButton')}</Text>
            </View>
          </Pressable>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ScanDetail({
  scan,
  onOpen,
  t,
}: {
  scan: ScanResult;
  onOpen: () => void;
  t: (k: string, vars?: any) => string;
}) {
  const date = new Date(scan.createdAt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const sortedDims = Object.entries(scan.dimensions).sort((a, b) => b[1] - a[1]);
  return (
    <Pressable style={styles.scanDetail} onPress={onOpen}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.scanDetailDate}>{date}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={styles.scanDetailScore}>{scan.overall}</Text>
          <Text style={styles.scanDetailUnit}>/100</Text>
        </View>
      </View>
      <View style={styles.scanDetailDims}>
        {sortedDims.map(([name, v]) => (
          <View key={name} style={styles.scanDetailDim}>
            <Text style={styles.scanDetailDimName}>{t(`scan.dimensions.${name}` as any)}</Text>
            <Text style={styles.scanDetailDimVal}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Text style={styles.scanDetailOpen}>{t('common.open')}</Text>
        <Ionicons name="chevron-forward" size={12} color={colors.bronze} />
      </View>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Eyebrow>{title}</Eyebrow>
      <View style={{ marginTop: spacing.sm }}>{children}</View>
    </View>
  );
}

function BigStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.bigStat}>
      <Text style={styles.bigStatLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={styles.bigStatValue}>{value}</Text>
        {unit && <Text style={styles.bigStatUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 16 },

  content: { padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },

  bigStat: {
    flex: 1, padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    gap: 6,
  },
  bigStatLabel: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  bigStatValue: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 38, letterSpacing: type.letterSpacing.tighter },
  bigStatUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 14, marginLeft: 4, marginBottom: 8 },

  section: {
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    gap: spacing.sm,
  },
  empty: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 13, paddingVertical: spacing.md },

  lineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 },
  lineCol: { flex: 1, alignItems: 'center', gap: 4 },
  lineVal: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 9, letterSpacing: 0.3 },
  lineBar: { width: '70%', borderRadius: 3, minHeight: 4 },

  heatRow: { flexDirection: 'row', gap: 4, height: 36 },
  heatCell: { flex: 1, borderRadius: 3 },

  miniCard: {
    flex: 1,
    padding: spacing.lg, borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    gap: 6,
  },
  miniCardGood: { borderColor: 'rgba(126,158,122,0.3)' },
  miniCardWatch: { borderColor: 'rgba(176,88,79,0.3)' },
  miniName: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13, marginTop: 4 },
  miniValue: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 28, letterSpacing: type.letterSpacing.tight },

  moodCard: {
    padding: spacing.lg, borderRadius: radius.md,
    backgroundColor: colors.bronzeOnBlack,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.25)',
    gap: 4,
  },
  moodValue: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 20, letterSpacing: type.letterSpacing.tight, marginTop: 4 },
  moodRibbon: { flexDirection: 'row', gap: 3, marginTop: spacing.md, height: 8 },
  moodRibbonCell: { flex: 1, borderRadius: 2 },

  milestonesRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  milestonesGlyph: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(176,138,90,0.10)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  milestonesText: { flex: 1, color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },

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
  proCtaBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
  },
  proCtaBtnText: {
    color: colors.textOnBronze,
    fontFamily: type.family.sansSemi,
    fontSize: 10.5,
    letterSpacing: 0.3,
  },

  scanDetail: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline,
    gap: spacing.sm,
  },
  scanDetailDate: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13 },
  scanDetailScore: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 22, letterSpacing: type.letterSpacing.tight },
  scanDetailUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, marginLeft: 2 },
  scanDetailDims: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scanDetailDim: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    flexDirection: 'row', gap: 6, alignItems: 'baseline',
  },
  scanDetailDimName: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.3 },
  scanDetailDimVal: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 12 },
  scanDetailOpen: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },

  askCoachBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: radius.pill,
    backgroundColor: colors.bronze,
  },
  askCoachText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.2 },
});
