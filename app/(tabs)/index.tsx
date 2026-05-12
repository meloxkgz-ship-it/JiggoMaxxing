import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { JMMark } from '@/components/JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { listEntries, todayKey } from '@/lib/journal';
import { DEFAULT_PLAN, getCompletion } from '@/lib/plan';
import { listScans } from '@/lib/scan';
import { getSettings } from '@/lib/settings';
import { JournalEntry, ScanResult, Settings } from '@/lib/types';

const PILLARS = ['Grooming', 'Physique', 'Style', 'Confidence'] as const;

function scoreToPillar(score: number): number {
  // Map 60–95 to 50–95
  return Math.max(50, Math.min(95, Math.round(score)));
}

export default function HomeHubScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [planDone, setPlanDone] = useState(0);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [s, sc, je, pc] = await Promise.all([
        getSettings(),
        listScans(),
        listEntries(),
        getCompletion(),
      ]);
      setSettings(s);
      setScan(sc[0] ?? null);
      setJournal(je);
      setPlanDone((pc[todayKey()] ?? []).length);
    })();
  }, []));

  const greeting = (() => {
    const h = new Date().getHours();
    const name = settings?.name?.split(' ')[0];
    const time = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
    return name ? `${time}, ${name}.` : `${time}.`;
  })();

  const overall = scan?.overall ?? null;
  const pillarScores = scan
    ? PILLARS.map((p, i) => {
        // distribute around overall +/- 8 deterministically
        const base = scan.overall;
        const skews = [+4, -6, +8, -2];
        return Math.max(35, Math.min(95, base + skews[i]));
      })
    : null;

  const lastJournal = journal[0];
  const recentScanRun = scan?.createdAt
    ? new Date(scan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topbar}>
          <JMMark size={36} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/settings' as any)}>
              <Ionicons name="lock-closed" size={14} color={colors.bronze} />
              <Text style={styles.iconBtnText}>Private</Text>
            </Pressable>
            <Pressable
              style={styles.settingsBtn}
              onPress={() => router.push('/settings' as any)}
              hitSlop={6}>
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.header}>
          <Eyebrow>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Eyebrow>
          <Text style={styles.displayTitle}>Build your{'\n'}edge.</Text>
          <Text style={styles.tagline}>{greeting} Insight, not judgement.</Text>
        </View>

        {/* Hero — edge index */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={['#1A1411', '#0E0B09', '#080606']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}>
            <View style={styles.heroTop}>
              <Eyebrow>Edge Index</Eyebrow>
              <Pressable
                onPress={() => router.push('/scan' as any)}
                style={styles.heroLink}>
                <Text style={styles.heroLinkText}>
                  {recentScanRun ? `Scan · ${recentScanRun}` : 'No scan yet'}
                </Text>
                <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
              </Pressable>
            </View>
            <View style={styles.heroNumberRow}>
              <Text style={styles.heroNumber}>{overall ?? '—'}</Text>
              {overall !== null && <Text style={styles.heroOutOf}>/100</Text>}
            </View>
            <Text style={styles.heroNote}>
              {scan?.insight ?? 'Take your first scan to set a private baseline. Nothing leaves your device.'}
            </Text>

            <View style={styles.pillarsRow}>
              {PILLARS.map((p, i) => {
                const v = pillarScores ? pillarScores[i] : 0;
                return (
                  <View key={p} style={styles.pillar}>
                    <View style={styles.pillarBar}>
                      <View style={[styles.pillarBarFill, { width: `${v}%` }]} />
                    </View>
                    <Text style={styles.pillarLabel}>{p}</Text>
                    <Text style={styles.pillarPct}>{v || '—'}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </View>

        {/* Today */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Eyebrow>Today</Eyebrow>
            <Pressable hitSlop={8} onPress={() => router.push('/plan' as any)}>
              <Text style={styles.sectionLink}>View plan ›</Text>
            </Pressable>
          </View>

          <Card variant="elevated" style={styles.todayCard}>
            {DEFAULT_PLAN.slice(0, 3).map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => router.push('/plan' as any)}
                style={[
                  styles.todayRow,
                  i !== 2 && styles.todayRowDivider,
                ]}>
                <View style={styles.todayIcon}>
                  <Ionicons
                    name={
                      a.category === 'Grooming' ? 'water-outline'
                      : a.category === 'Physique' ? 'barbell-outline'
                      : 'shirt-outline'
                    }
                    size={18}
                    color={colors.bronze}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.todayTitle}>{a.title}</Text>
                  <Text style={styles.todayMeta}>{a.category} · {a.duration}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
            <View style={styles.todayFooter}>
              <Text style={styles.todayFooterText}>
                {planDone} of {DEFAULT_PLAN.length} done today
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(planDone / DEFAULT_PLAN.length) * 100}%` },
                  ]}
                />
              </View>
            </View>
          </Card>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Eyebrow>Capture</Eyebrow>
          <View style={styles.quickRow}>
            <QuickAction
              icon="scan-outline"
              title="Max Scan"
              subtitle="On‑device · 6 dimensions"
              onPress={() => router.push('/scan' as any)}
            />
            <QuickAction
              icon="create-outline"
              title="Journal entry"
              subtitle="Weight · mood · notes"
              onPress={() => router.push('/journal-entry' as any)}
            />
          </View>
        </View>

        {/* Recent journal */}
        {lastJournal && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Eyebrow>Latest journal</Eyebrow>
              <Pressable hitSlop={8} onPress={() => router.push('/journal' as any)}>
                <Text style={styles.sectionLink}>All entries ›</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => router.push('/journal' as any)}
              style={styles.journalCard}>
              {(lastJournal.weightKg || lastJournal.sleepHours) && (
                <View style={styles.journalStats}>
                  {lastJournal.weightKg && (
                    <Text style={styles.journalStat}>{lastJournal.weightKg.toFixed(1)} kg</Text>
                  )}
                  {lastJournal.sleepHours && (
                    <Text style={styles.journalStat}>{lastJournal.sleepHours} h sleep</Text>
                  )}
                  {lastJournal.mood && <Text style={styles.journalMood}>{lastJournal.mood}</Text>}
                </View>
              )}
              {lastJournal.notes ? (
                <Text style={styles.journalNote} numberOfLines={3}>{lastJournal.notes}</Text>
              ) : (
                <Text style={[styles.journalNote, { color: colors.textTertiary }]}>No notes.</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Coach teaser */}
        <View style={styles.section}>
          <Pressable
            style={styles.coachCard}
            onPress={() => router.push('/coach' as any)}>
            <View style={{ flex: 1 }}>
              <Eyebrow>Coach</Eyebrow>
              <Text style={styles.coachTitle}>
                Talk to your{'\n'}private coach.
              </Text>
              <Text style={styles.coachBody}>
                Personalised routines, fit feedback, discipline frameworks. Never shaming, never rating.
              </Text>
              <View style={styles.coachCta}>
                <Text style={styles.coachCtaText}>Open coach</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textOnBronze} />
              </View>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickCard}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={18} color={colors.bronze} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  iconBtnText: {
    color: colors.bronze,
    fontFamily: type.family.sansMedium,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },

  header: { marginTop: spacing.xxl, gap: spacing.sm },
  displayTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: type.size.displayLg,
    lineHeight: type.size.displayLg * 0.98,
    letterSpacing: type.letterSpacing.tighter,
    marginTop: 4,
  },
  tagline: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: type.size.body,
    marginTop: 6,
  },

  heroWrap: { marginTop: spacing.xl },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.18)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLinkText: {
    color: colors.textTertiary,
    fontFamily: type.family.sansMedium,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  heroNumber: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: type.letterSpacing.tighter,
  },
  heroOutOf: {
    color: colors.textTertiary,
    fontFamily: type.family.sansMedium,
    fontSize: 18,
    marginBottom: 14,
    marginLeft: 4,
  },
  heroNote: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  pillarsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xl,
  },
  pillar: { flex: 1, gap: 6 },
  pillarBar: { height: 3, backgroundColor: colors.hairline, borderRadius: 2, overflow: 'hidden' },
  pillarBarFill: { height: '100%', backgroundColor: colors.bronze },
  pillarLabel: {
    color: colors.textTertiary,
    fontFamily: type.family.sansMedium,
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pillarPct: {
    color: colors.textPrimary,
    fontFamily: type.family.sansSemi,
    fontSize: 14,
  },

  section: { marginTop: spacing.xxl, gap: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLink: {
    color: colors.bronze,
    fontFamily: type.family.sansMedium,
    fontSize: 12,
    letterSpacing: 0.3,
  },

  todayCard: { padding: 0 },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  todayRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  todayIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.bronzeOnBlack,
    alignItems: 'center', justifyContent: 'center',
  },
  todayTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 15 },
  todayMeta: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 12, marginTop: 2 },
  todayFooter: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    gap: 8,
  },
  todayFooterText: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  progressTrack: { height: 3, backgroundColor: colors.hairline, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.bronze },

  quickRow: { flexDirection: 'row', gap: spacing.md },
  quickCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    minHeight: 124,
    justifyContent: 'space-between',
  },
  quickIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.bronzeOnBlack,
    alignItems: 'center', justifyContent: 'center',
  },
  quickTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansSemi,
    fontSize: 14,
    marginTop: spacing.md,
  },
  quickSubtitle: {
    color: colors.textTertiary,
    fontFamily: type.family.sans,
    fontSize: 11.5,
    marginTop: 2,
  },

  journalCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    gap: spacing.sm,
  },
  journalStats: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  journalStat: { color: colors.bronze, fontFamily: type.family.sansSemi, fontSize: 12, letterSpacing: 0.3 },
  journalMood: {
    color: colors.textTertiary,
    fontFamily: type.family.sansMedium,
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  journalNote: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13.5, lineHeight: 20 },

  coachCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.22)',
  },
  coachTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: type.letterSpacing.tight,
    marginTop: spacing.sm,
  },
  coachBody: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  coachCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bronze,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
  coachCtaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.2 },
});
