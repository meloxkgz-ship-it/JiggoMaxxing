import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { JMMark } from '@/components/JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import * as Haptics from 'expo-haptics';

import { MilestoneCelebration } from '@/components/MilestoneCelebration';
import { WarmPushPrompt } from '@/components/WarmPushPrompt';
import {
  getNotificationPref,
  requestPermission,
  scheduleNudgeNotification,
  setNotificationPref,
} from '@/lib/notifications';
import { saveSettings as persistSettings } from '@/lib/settings';
import { computeEdge, EdgeBreakdown } from '@/lib/edge';
import { useLanguage, useT } from '@/lib/i18n';
import { getStreak, listEntries, todayKey } from '@/lib/journal';
import { getActivePlan, getCompletion } from '@/lib/plan';
import {
  canGraceToday,
  consumeMilestone,
  getNudgeStreak,
  getTodayNudge,
  graceToday,
  isNudgeDone,
  Nudge,
  setNudgeDone,
} from '@/lib/nudge';
import { Alert } from 'react-native';
import { computeWeeklyRecap, isSunday, WeeklyRecap } from '@/lib/recap';
import { getRitualForNow } from '@/lib/rituals';
import { listScans } from '@/lib/scan';
import { getSettings } from '@/lib/settings';
import { JournalEntry, PlanItem, ScanResult, Settings } from '@/lib/types';

const PILLARS = ['Grooming', 'Physique', 'Style', 'Confidence'] as const;

function scoreToPillar(score: number): number {
  // Map 60–95 to 50–95
  return Math.max(50, Math.min(95, Math.round(score)));
}

export default function HomeHubScreen() {
  const t = useT();
  const { lang } = useLanguage();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  // Score of the scan before the most recent one — used to show a quiet
  // "+3 vs last reading" delta on the Edge Index. Null when fewer than 2.
  const [previousScanOverall, setPreviousScanOverall] = useState<number | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [planDone, setPlanDone] = useState(0);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [nudgeDone, setNudgeDoneState] = useState(false);
  const [nudgeStreak, setNudgeStreak] = useState(0);
  const [journalStreak, setJournalStreak] = useState(0);
  const [edge, setEdge] = useState<EdgeBreakdown | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [graceAvail, setGraceAvail] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  // Computed only on Sundays via `isSunday()` guard — other days the card
  // is hidden so we don't pay the AsyncStorage round-trip.
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  // Tracks the queued warm-push timeout so we can cancel on dismiss/unmount
  // and avoid stacking duplicates across rapid focus + pull-to-refresh.
  const pushPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Once we've decided to show the prompt this session, suppress further
  // schedules even before the persisted `pushAsked` flag round-trips.
  const pushPromptScheduledRef = useRef(false);

  const reload = useCallback(async () => {
    const [s, sc, je, pc, pp, nd, ns, js, eb, ga] = await Promise.all([
      getSettings(),
      listScans(),
      listEntries(),
      getCompletion(),
      getActivePlan(),
      isNudgeDone(),
      getNudgeStreak(),
      getStreak(),
      computeEdge(),
      canGraceToday(),
    ]);
    setSettings(s);
    setScan(sc[0] ?? null);
    setPreviousScanOverall(sc.length >= 2 ? sc[1].overall : null);
    // Compute the recap only on Sundays — the card is hidden the rest of
    // the week and the storage round-trip isn't worth paying.
    if (isSunday()) {
      setRecap(await computeWeeklyRecap());
    } else {
      setRecap(null);
    }
    setJournal(je);
    setPlan(pp);
    setPlanDone((pc[todayKey()] ?? []).length);
    setNudge(getTodayNudge(lang, (s.goals as any) ?? undefined));
    setNudgeDoneState(nd);
    setNudgeStreak(ns);
    setJournalStreak(js);
    setEdge(eb);
    setGraceAvail(ga);

    // Warm push permission ask: once per session, after the first Edge Index
    // render. The scheduled ref + timer-ref pair guards against pull-to-refresh
    // queueing duplicates and against a stale timer firing AFTER dismiss but
    // BEFORE the `pushAsked: true` write round-trips.
    if (
      !s.pushAsked &&
      !pushPromptScheduledRef.current &&
      eb &&
      eb.total > 0
    ) {
      const np = await getNotificationPref();
      if (!np.enabled) {
        pushPromptScheduledRef.current = true;
        // Delay a beat so the home animations land first.
        pushPromptTimerRef.current = setTimeout(() => {
          pushPromptTimerRef.current = null;
          setShowPushPrompt(true);
        }, 900);
      }
    }
  }, [lang]);

  // Clear any pending warm-push timer on unmount so it can't fire after
  // navigation away (e.g. into onboarding via reset-all).
  useEffect(() => {
    return () => {
      if (pushPromptTimerRef.current) {
        clearTimeout(pushPromptTimerRef.current);
        pushPromptTimerRef.current = null;
      }
    };
  }, []);

  // When the user switches language while Home is still focused, cached
  // strings outside `t()` (the nudge title/body) stay in the previous
  // language until a focus event. Re-pull on lang change.
  useEffect(() => {
    if (settings) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const enablePush = async () => {
    // Persist optimistically + close before triggering the OS prompt so a
    // racing reload can't queue a second modal in the meantime.
    pushPromptScheduledRef.current = true;
    if (pushPromptTimerRef.current) {
      clearTimeout(pushPromptTimerRef.current);
      pushPromptTimerRef.current = null;
    }
    await persistSettings({ pushAsked: true });
    setShowPushPrompt(false);
    const granted = await requestPermission();
    if (granted) {
      const pref = { enabled: true, hour: 9, minute: 0 };
      await setNotificationPref(pref);
      await scheduleNudgeNotification(pref, lang);
    } else {
      // OS denial — give the user a clear path back via Settings.
      Alert.alert(
        t('settings.permissionNeeded'),
        t('settings.permissionBody'),
      );
    }
  };

  const dismissPush = async () => {
    pushPromptScheduledRef.current = true;
    if (pushPromptTimerRef.current) {
      clearTimeout(pushPromptTimerRef.current);
      pushPromptTimerRef.current = null;
    }
    // Persist FIRST so a racing reload won't re-read pushAsked=false.
    await persistSettings({ pushAsked: true });
    setShowPushPrompt(false);
  };

  const useGrace = async () => {
    const ok = await graceToday();
    if (!ok) {
      Alert.alert(t('home.graceUnavailable'), t('home.graceUnavailableBody'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert(t('home.graceUsedTitle'), t('home.graceUsedBody'));
    await reload();
  };

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await reload();
    setRefreshing(false);
  };

  const toggleNudge = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = !nudgeDone;
    await setNudgeDone(next);
    setNudgeDoneState(next);
    const newStreak = await getNudgeStreak();
    setNudgeStreak(newStreak);
    if (next) {
      const m = await consumeMilestone(newStreak);
      if (m != null) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setMilestone(m);
      }
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    const name = settings?.name?.split(' ')[0];
    const time = t(h < 12 ? 'greeting.morning' : h < 18 ? 'greeting.afternoon' : 'greeting.evening');
    return name ? `${time}, ${name}.` : `${time}.`;
  })();

  const overall = edge?.total ?? null;
  const pillarScores = edge
    ? [
        // grooming → tied to scan + journal
        Math.round(edge.scan * 0.6 + edge.journal * 0.4),
        // physique → tied to journal + plan
        Math.round(edge.journal * 0.5 + edge.plan * 0.5),
        // style → tied to scan + nudge
        Math.round(edge.scan * 0.5 + edge.nudge * 0.5),
        // confidence → tied to nudge + plan + journal
        Math.round((edge.nudge + edge.plan + edge.journal) / 3),
      ]
    : null;

  const lastJournal = journal[0];
  const recentScanRun = scan?.createdAt
    ? new Date(scan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <MilestoneCelebration milestone={milestone} onDismiss={() => setMilestone(null)} />
      <WarmPushPrompt visible={showPushPrompt} onEnable={enablePush} onLater={dismissPush} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.bronze}
          />
        }>
        {/* Top bar */}
        <View style={styles.topbar}>
          <JMMark size={36} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/settings' as any)}>
              <Ionicons name="lock-closed" size={14} color={colors.bronze} />
              <Text style={styles.iconBtnText}>{t('common.private')}</Text>
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
          <Text style={styles.displayTitle}>{t('app.tagline').split('.')[0]}.</Text>
          <Text style={styles.tagline}>{greeting} {t('app.motto')}</Text>
        </View>

        {/* Daily Edge Nudge */}
        {nudge && (
          <Animated.View entering={FadeInDown.duration(420).delay(80)}>
          <Pressable
            onPress={toggleNudge}
            accessibilityRole="button"
            accessibilityLabel={nudgeDone ? t('home.nudgeDone') : t('home.nudgeMark')}
            accessibilityState={{ checked: nudgeDone }}
            style={[styles.nudgeCard, nudgeDone && styles.nudgeCardDone]}>
            <View style={styles.nudgeHead}>
              <View style={styles.nudgeBadge}>
                <Ionicons
                  name={nudgeDone ? 'checkmark-circle' : 'sparkles'}
                  size={12}
                  color={nudgeDone ? colors.positive : colors.bronze}
                />
                <Text style={[styles.nudgeBadgeText, nudgeDone && { color: colors.positive }]}>
                  {nudgeDone ? t('home.nudgeDone') : t('home.nudge')}
                </Text>
              </View>
              {nudgeStreak > 0 && (
                <Text style={styles.nudgeStreak}>
                  {t('home.nudgeStreak', { n: nudgeStreak })}
                </Text>
              )}
            </View>
            <Text style={styles.nudgeTitle}>{nudge.title}</Text>
            <Text style={styles.nudgeBody}>{nudge.body}</Text>
            <View style={styles.nudgeFoot}>
              <Text style={styles.nudgeTheme}>{nudge.theme}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!nudgeDone && graceAvail && (
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); useGrace(); }}
                    hitSlop={6}
                    style={styles.graceBtn}>
                    <Text style={styles.graceBtnText}>{t('home.grace')}</Text>
                  </Pressable>
                )}
                <View style={[styles.nudgeCheck, nudgeDone && styles.nudgeCheckDone]}>
                  {nudgeDone && <Ionicons name="checkmark" size={14} color={colors.textOnBronze} />}
                </View>
              </View>
            </View>
          </Pressable>
          </Animated.View>
        )}

        {/* Hero — edge index */}
        <Animated.View entering={FadeInDown.duration(420).delay(180)} style={styles.heroWrap}>
          <LinearGradient
            colors={['#1A1411', '#0E0B09', '#080606']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}>
            <View style={styles.heroTop}>
              <Eyebrow>{t('home.edgeIndex')}</Eyebrow>
              <Pressable
                onPress={() => router.push('/scan' as any)}
                style={styles.heroLink}>
                <Text style={styles.heroLinkText}>
                  {recentScanRun ? t('home.scanOn', { date: recentScanRun }) : t('home.noScanYet')}
                </Text>
                <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
              </Pressable>
            </View>
            <View style={styles.heroNumberRow}>
              <CountUp value={overall} style={styles.heroNumber} fallback="—" />
              {overall !== null && <Text style={styles.heroOutOf}>/100</Text>}
              {/* Trajectory chip — quiet "+3 / -2" indicator vs. the previous
                  reading. Hidden when there's no comparison or the delta is 0
                  (a flat reading isn't worth a callout). */}
              {scan && previousScanOverall != null && scan.overall !== previousScanOverall && (
                <View
                  style={[
                    styles.deltaChip,
                    scan.overall > previousScanOverall ? styles.deltaChipUp : styles.deltaChipDown,
                  ]}>
                  <Ionicons
                    name={scan.overall > previousScanOverall ? 'arrow-up' : 'arrow-down'}
                    size={11}
                    color={scan.overall > previousScanOverall ? colors.positive : colors.danger}
                  />
                  <Text
                    style={[
                      styles.deltaChipText,
                      { color: scan.overall > previousScanOverall ? colors.positive : colors.danger },
                    ]}>
                    {Math.abs(scan.overall - previousScanOverall)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.heroNote}>
              {scan?.insight ?? t('home.edgeIndexEmpty')}
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
        </Animated.View>

        {/* Today */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Eyebrow>{t('home.todaySection')}</Eyebrow>
            <Pressable hitSlop={8} onPress={() => router.push('/plan' as any)}>
              <Text style={styles.sectionLink}>{t('home.viewPlan')}</Text>
            </Pressable>
          </View>

          <Card variant="elevated" style={styles.todayCard}>
            {plan.slice(0, 3).map((a, i) => (
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
                {t('home.todayDone', { done: planDone, total: plan.length || 1 })}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    // Clamp to 100: a stale completion id from a previously
                    // active template can push the count past plan.length.
                    { width: `${Math.min(100, (planDone / Math.max(1, plan.length)) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          </Card>
        </View>

        {/* Sunday Recap — appears only on Sundays. Editorial summary of
            what the user *did* over the past 7 days. Framing: never about
            what was missed; only what landed. */}
        {recap && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Eyebrow>{t('home.recapTitle')}</Eyebrow>
              <Text style={styles.sectionLink}>{t('home.recapSub')}</Text>
            </View>
            <View style={styles.recapCard}>
              <View style={styles.recapRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.bronze} />
                <Text style={styles.recapText}>{t('home.recapPlan', { n: recap.planItemsDone })}</Text>
                <Text style={styles.recapMeta}>{Math.round(recap.planAdherence * 100)}%</Text>
              </View>
              <View style={styles.recapRow}>
                <Ionicons name="book-outline" size={14} color={colors.bronze} />
                <Text style={styles.recapText}>{t('home.recapJournal', { n: recap.journalDays })}</Text>
                <Text style={styles.recapMeta}>{recap.journalDays}/7</Text>
              </View>
              <View style={styles.recapRow}>
                <Ionicons name="flame-outline" size={14} color={colors.bronze} />
                <Text style={styles.recapText}>{t('home.recapNudges', { n: recap.nudgeDays })}</Text>
                <Text style={styles.recapMeta}>{recap.nudgeDays}/7</Text>
              </View>
              {recap.topMood && (
                <View style={styles.recapRow}>
                  <Ionicons name="pulse-outline" size={14} color={colors.bronze} />
                  <Text style={styles.recapText}>
                    {t('home.recapMood', { mood: t(`journal.moods.${recap.topMood}`) })}
                  </Text>
                </View>
              )}
              {recap.scanDelta !== null && (
                <View style={styles.recapRow}>
                  <Ionicons
                    name={recap.scanDelta > 0 ? 'arrow-up' : recap.scanDelta < 0 ? 'arrow-down' : 'remove-outline'}
                    size={14}
                    color={
                      recap.scanDelta > 0 ? colors.positive
                      : recap.scanDelta < 0 ? colors.danger
                      : colors.bronze
                    }
                  />
                  <Text style={styles.recapText}>
                    {recap.scanDelta > 0
                      ? t('home.recapScanUp', { n: recap.scanDelta })
                      : recap.scanDelta < 0
                        ? t('home.recapScanDown', { n: Math.abs(recap.scanDelta) })
                        : t('home.recapScanFlat')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Tomorrow's first move — quiet preview, only when today is wrapped
            OR it's late evening. Forward-rhythm framing: the ritual is already
            set up, the user can release the day. */}
        {(() => {
          const hour = new Date().getHours();
          const allDone = plan.length > 0 && planDone >= plan.length;
          if (plan.length === 0) return null;
          if (!allDone && hour < 19) return null;
          const first = plan[0];
          if (!first) return null;
          return (
            <View style={styles.section}>
              <Eyebrow>{t('home.tomorrowSection')}</Eyebrow>
              <Card variant="elevated" style={styles.tomorrowCard}>
                <View style={styles.tomorrowRow}>
                  <View style={styles.tomorrowTime}>
                    <Text style={styles.tomorrowTimeText}>{first.time}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tomorrowTitle}>{first.title}</Text>
                    <Text style={styles.tomorrowMeta}>{first.category} · {first.duration}</Text>
                  </View>
                  <Ionicons name="moon-outline" size={18} color={colors.bronze} />
                </View>
                <Text style={styles.tomorrowSub}>{t('home.tomorrowSub')}</Text>
              </Card>
            </View>
          );
        })()}

        {/* Stats overview */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Eyebrow>{t('home.stats')}</Eyebrow>
            <Pressable hitSlop={8} onPress={() => router.push('/insights' as any)}>
              <Text style={styles.sectionLink}>{t('home.seeInsights')} ›</Text>
            </Pressable>
          </View>
          <View style={styles.statsGrid}>
            <StatTile
              icon="sparkles"
              label={t('home.statsNudge')}
              value={nudgeStreak.toString()}
              unit={t('home.statsDays')}
              accent={nudgeStreak > 0}
            />
            <StatTile
              icon="pulse"
              label={t('home.statsJournal')}
              value={journalStreak.toString()}
              unit={t('home.statsDays')}
              accent={journalStreak > 0}
            />
            <StatTile
              icon="calendar"
              label={t('home.statsPlan')}
              value={`${planDone}/${plan.length || 1}`}
              unit=""
              accent={planDone > 0}
            />
            <StatTile
              icon="scan"
              label={t('home.statsScan')}
              value={scan?.overall?.toString() ?? '—'}
              unit={scan ? '/100' : ''}
              accent={!!scan}
            />
          </View>
        </View>

        {/* Recent wins — positive-signal strip. Only renders when at least
            one signal exists; we never show an empty box that would read as
            "nothing has happened". Trajectory framing, not score framing. */}
        {(() => {
          const wins: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [];
          if (planDone > 0) {
            wins.push({ icon: 'checkmark-circle-outline', text: t('home.winsPlanDone', { n: planDone }) });
          }
          if (journal[0]?.date === todayKey()) {
            wins.push({ icon: 'book-outline', text: t('home.winsJournalToday') });
          }
          if (nudgeStreak >= 3) {
            wins.push({ icon: 'flame-outline', text: t('home.winsNudgeStreak', { n: nudgeStreak }) });
          }
          if (journalStreak >= 3) {
            wins.push({ icon: 'pulse-outline', text: t('home.winsJournalStreak', { n: journalStreak }) });
          }
          if (scan && wins.length < 3) {
            wins.push({ icon: 'sparkles-outline', text: t('home.winsLastScan', { n: scan.overall }) });
          }
          const top = wins.slice(0, 3);
          if (top.length === 0) return null;
          return (
            <View style={styles.section}>
              <Eyebrow>{t('home.winsTitle')}</Eyebrow>
              <View style={styles.winsRow}>
                {top.map((w, i) => (
                  <View key={i} style={styles.winChip}>
                    <Ionicons name={w.icon} size={14} color={colors.bronze} />
                    <Text style={styles.winText}>{w.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Today's ritual — a contextual short sequence (morning / reset /
            evening based on local hour). Distinct from the plan: this is
            what you *enter*, not what you do across the week. */}
        {(() => {
          const ritual = getRitualForNow(lang);
          return (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Eyebrow>{t('rituals.todayRitual')}</Eyebrow>
                <Pressable hitSlop={8} onPress={() => router.push('/rituals' as any)}>
                  <Text style={styles.sectionLink}>{t('rituals.seeAll')} ›</Text>
                </Pressable>
              </View>
              <Pressable
                style={styles.ritualCard}
                onPress={() => router.push('/rituals' as any)}>
                <View style={styles.ritualHead}>
                  <Ionicons
                    name={
                      ritual.context === 'morning' ? 'sunny-outline'
                      : ritual.context === 'reset' ? 'compass-outline'
                      : 'moon-outline'
                    }
                    size={16}
                    color={colors.bronze}
                  />
                  <Text style={styles.ritualTitle}>{ritual.title}</Text>
                  <Text style={styles.ritualDuration}>{ritual.duration}</Text>
                </View>
                <Text style={styles.ritualIntention}>{ritual.intention}</Text>
              </Pressable>
            </View>
          );
        })()}

        {/* Quick actions */}
        <View style={styles.section}>
          <Eyebrow>{t('home.capture')}</Eyebrow>
          <View style={styles.quickRow}>
            <QuickAction
              icon="scan-outline"
              title={t('home.quickScan')}
              subtitle={t('home.quickScanSub')}
              onPress={() => router.push('/scan' as any)}
            />
            <QuickAction
              icon="create-outline"
              title={t('home.quickJournal')}
              subtitle={t('home.quickJournalSub')}
              onPress={() => router.push('/journal-entry' as any)}
            />
          </View>
        </View>

        {/* Recent journal */}
        {lastJournal && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Eyebrow>{t('home.latestJournal')}</Eyebrow>
              <Pressable hitSlop={8} onPress={() => router.push('/journal' as any)}>
                <Text style={styles.sectionLink}>{t('common.seeAll')} ›</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => router.push('/journal' as any)}
              style={styles.journalCard}>
              {(lastJournal.weightKg || lastJournal.sleepHours) && (
                <View style={styles.journalStats}>
                  {lastJournal.weightKg && (
                    <Text style={styles.journalStat}>{lastJournal.weightKg.toFixed(1)} {t('common.units_kg')}</Text>
                  )}
                  {lastJournal.sleepHours && (
                    <Text style={styles.journalStat}>{lastJournal.sleepHours} {t('common.units_h')} {t('journal.sleep').toLowerCase().replace(/[()]|h/g, '').trim()}</Text>
                  )}
                  {lastJournal.mood && <Text style={styles.journalMood}>{t(`journal.moods.${lastJournal.mood}`)}</Text>}
                </View>
              )}
              {lastJournal.notes ? (
                <Text style={styles.journalNote} numberOfLines={3}>{lastJournal.notes}</Text>
              ) : (
                <Text style={[styles.journalNote, { color: colors.textTertiary }]}>{t('home.noJournalNotes')}</Text>
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
              <Eyebrow>{t('coach.title')}</Eyebrow>
              <Text style={styles.coachTitle}>{t('home.coachTitle')}</Text>
              <Text style={styles.coachBody}>{t('home.coachBody')}</Text>
              <View style={styles.coachCta}>
                <Text style={styles.coachCtaText}>{t('home.openCoach')}</Text>
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

function CountUp({
  value,
  style,
  fallback,
  duration = 700,
}: {
  value: number | null;
  style: any;
  fallback: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState<number | null>(value == null ? null : 0);
  useEffect(() => {
    if (value == null) { setDisplay(null); return; }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <Text style={style}>{display == null ? fallback : display}</Text>;
}

function StatTile({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit: string;
  accent: boolean;
}) {
  return (
    <View style={[styles.statTile, accent && styles.statTileAccent]}>
      <Ionicons name={icon} size={14} color={accent ? colors.bronze : colors.textTertiary} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
        <Text style={[styles.statTileValue, accent && styles.statTileValueAccent]}>{value}</Text>
        {unit && <Text style={styles.statTileUnit}>{unit}</Text>}
      </View>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
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

  nudgeCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.32)',
    gap: 6,
  },
  nudgeCardDone: { borderColor: 'rgba(126,158,122,0.35)', backgroundColor: 'rgba(126,158,122,0.06)' },
  nudgeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nudgeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill,
    backgroundColor: colors.bronzeOnBlack,
  },
  nudgeBadgeText: { color: colors.bronze, fontFamily: type.family.sansSemi, fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase' },
  nudgeStreak: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.3 },
  nudgeTitle: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 18, lineHeight: 23, letterSpacing: type.letterSpacing.tight, marginTop: 2 },
  nudgeBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13.5, lineHeight: 20 },
  nudgeFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  nudgeTheme: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  nudgeCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  nudgeCheckDone: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  graceBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.4)',
    backgroundColor: colors.bronzeOnBlack,
  },
  graceBtnText: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase' },

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
  deltaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginLeft: 'auto',
    marginBottom: 18,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deltaChipUp:   { borderColor: 'rgba(126,158,122,0.35)', backgroundColor: 'rgba(126,158,122,0.10)' },
  deltaChipDown: { borderColor: 'rgba(176,88,79,0.35)',  backgroundColor: 'rgba(176,88,79,0.10)' },
  deltaChipText: { fontFamily: type.family.sansBlack, fontSize: 11, letterSpacing: 0.4 },
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

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statTile: {
    flexBasis: '47%', flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    gap: 2,
  },
  statTileAccent: { borderColor: 'rgba(176,138,90,0.32)', backgroundColor: colors.surfaceElevated },
  statTileValue: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 22, letterSpacing: type.letterSpacing.tight },
  statTileValueAccent: { color: colors.bronze },
  statTileUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11 },
  statTileLabel: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },

  quickRow: { flexDirection: 'row', gap: spacing.md },

  recapCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(176,138,90,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.22)',
    gap: 12,
  },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recapText: { flex: 1, color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 13.5 },
  recapMeta: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 12, letterSpacing: 0.4 },

  ritualCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    gap: spacing.sm,
  },
  ritualHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ritualTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14, flex: 1 },
  ritualDuration: {
    color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 11,
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  ritualIntention: { color: colors.textSecondary, fontFamily: type.family.sans, fontStyle: 'italic', fontSize: 13, lineHeight: 20 },

  tomorrowCard: { padding: spacing.lg, gap: spacing.sm },
  tomorrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tomorrowTime: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
    backgroundColor: 'rgba(176,138,90,0.10)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
  },
  tomorrowTimeText: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 14, letterSpacing: 0.5 },
  tomorrowTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },
  tomorrowMeta: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, marginTop: 2 },
  tomorrowSub: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12, fontStyle: 'italic' },

  winsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  winChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(176,138,90,0.10)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.28)',
  },
  winText: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.2 },
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
