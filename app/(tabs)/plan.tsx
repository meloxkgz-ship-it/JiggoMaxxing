import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useT } from '@/lib/i18n';
import { lastNDates } from '@/lib/dates';
import { todayKey } from '@/lib/journal';
import {
  ActiveTemplateId,
  deleteCustomItem,
  deleteUserTemplate,
  getActivePlan,
  getActiveTemplate,
  getCompletion,
  getCustomItems,
  listUserTemplates,
  PlanTemplate,
  PLAN_TEMPLATES,
  saveUserTemplate,
  setActiveTemplate,
  toggleComplete,
  UserTemplate,
} from '@/lib/plan';
import { PlanItem } from '@/lib/types';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


const TEMPLATES: PlanTemplate[] = ['foundations', 'disciplined', 'lean', 'travel', 'recovery', 'cut'];

export default function PlanScreen() {
  const t = useT();
  const [tpl, setTpl] = useState<ActiveTemplateId>('foundations');
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [doneToday, setDoneToday] = useState<string[]>([]);
  const [weekDone, setWeekDone] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [last28, setLast28] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const [tmpl, plan, map, ut] = await Promise.all([
      getActiveTemplate(),
      getActivePlan(),
      getCompletion(),
      listUserTemplates(),
    ]);
    setTpl(tmpl);
    setItems(plan);
    setUserTemplates(ut);
    setDoneToday(map[todayKey()] ?? []);
    const week = lastNDates(7);
    setWeekDone(week.map((d) => (map[d] ?? []).length));
    const month = lastNDates(28);
    setLast28(month.map((d) => (map[d] ?? []).length));
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const onToggle = async (id: string) => {
    const wasDone = doneToday.includes(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = await toggleComplete(id);
    setDoneToday(next);
    // Success haptic on completing an item — small earned-feedback moment
    // that doesn't fire on the un-toggle path.
    if (!wasDone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    refresh();
  };

  const switchTpl = async (v: ActiveTemplateId) => {
    Haptics.selectionAsync().catch(() => {});
    await setActiveTemplate(v);
    refresh();
  };

  const saveAsTemplate = () => {
    Alert.prompt?.(
      t('plan.saveAsTemplate'),
      t('plan.saveAsTemplatePh'),
      async (name?: string) => {
        if (!name?.trim()) return;
        const customs = await getCustomItems();
        // base = current template items + customs (without their ids regenerated)
        const baseItems =
          tpl in PLAN_TEMPLATES ? PLAN_TEMPLATES[tpl as PlanTemplate] : items.filter((i) => !i.id.startsWith('c_'));
        const tplItems = [...baseItems, ...customs].sort((a, b) => a.time.localeCompare(b.time));
        const created = await saveUserTemplate(name, tplItems);
        await setActiveTemplate(created.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert(t('plan.templateSaved'));
        refresh();
      },
    );
  };

  const removeUserTpl = (id: string, name: string) => {
    Alert.alert(t('plan.deleteTemplate'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteUserTemplate(id);
          if (tpl === id) await setActiveTemplate('foundations');
          refresh();
        },
      },
    ]);
  };

  const completed = doneToday.length;
  const total = items.length || 1;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow={t('plan.week', { done: completed, total })}
        title={t('plan.title')}
        subtitle={t('plan.subtitle')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.bronze} />}>
        {/* Template switcher */}
        <View style={styles.field}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Eyebrow>{t('plan.template')}</Eyebrow>
            <Pressable hitSlop={6} onPress={saveAsTemplate}>
              <Text style={styles.saveTplLink}>+ {t('plan.saveAsTemplate')}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {TEMPLATES.map((x) => (
              <Pressable
                key={x}
                onPress={() => switchTpl(x)}
                style={[styles.chip, tpl === x && styles.chipActive]}>
                <Text style={[styles.chipText, tpl === x && styles.chipTextActive]}>
                  {t(`plan.templates.${x}`)}
                </Text>
              </Pressable>
            ))}
            {userTemplates.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => switchTpl(u.id)}
                onLongPress={() => removeUserTpl(u.id, u.name)}
                style={[styles.chip, tpl === u.id && styles.chipActive]}>
                <Text style={[styles.chipText, tpl === u.id && styles.chipTextActive]}>
                  {u.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Next-up */}
        <NextUpCard items={items} doneToday={doneToday} t={t} />

        <Card variant="elevated" style={{ gap: spacing.md }}>
          <View style={styles.weekHead}>
            <Eyebrow>{t('plan.thisWeek')}</Eyebrow>
            <Text style={styles.completed}>{Math.round((completed / total) * 100)}% {t('common.today').toLowerCase()}</Text>
          </View>
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d, i) => {
              const isToday = i === todayIdx;
              const cnt = weekDone[i];
              return (
                <View key={d} style={[styles.weekDay, isToday && styles.weekDayActive]}>
                  <Text style={[styles.weekLabel, isToday && styles.weekLabelActive]}>{d}</Text>
                  <View
                    style={[
                      styles.weekDot,
                      cnt >= 3 && styles.weekDotDone,
                      isToday && styles.weekDotToday,
                    ]}
                  />
                  <Text style={styles.weekDone}>{cnt}/{total}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Eyebrow>{t('plan.todayLabel', { weekday })}</Eyebrow>
            <Text style={styles.sectionLink}>{t('plan.todayDone', { done: completed, total })}</Text>
          </View>
          <Card variant="elevated" style={{ padding: 0 }}>
            {items.map((it, i) => {
              const done = doneToday.includes(it.id);
              const isCustom = it.id.startsWith('c_');
              // Bucket the item by its parsed hour. When the bucket changes
              // vs. the prior item, render a small group divider so the
              // day's shape is readable at a glance.
              const hr = parseInt(it.time.split(':')[0] ?? '0', 10) || 0;
              const bucket: 'morning' | 'afternoon' | 'evening' =
                hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
              const prev = i > 0 ? items[i - 1] : null;
              const prevHr = prev ? parseInt(prev.time.split(':')[0] ?? '0', 10) || 0 : -1;
              const prevBucket = prev
                ? (prevHr < 12 ? 'morning' : prevHr < 17 ? 'afternoon' : 'evening')
                : null;
              const showBucket = bucket !== prevBucket;
              return (
                <View key={it.id}>
                {showBucket && (
                  <View style={styles.bucketHead}>
                    <Text style={styles.bucketText}>{t(`plan.bucket${bucket.charAt(0).toUpperCase() + bucket.slice(1)}`)}</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => onToggle(it.id)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${it.time} · ${it.title}`}
                  accessibilityState={{ checked: done }}
                  accessibilityHint={isCustom ? t('plan.editDeleteHint') : undefined}
                  onLongPress={
                    isCustom
                      ? () =>
                          Alert.alert(
                            it.title,
                            undefined,
                            [
                              { text: t('common.cancel'), style: 'cancel' },
                              {
                                text: t('common.edit'),
                                onPress: () => router.push({ pathname: '/plan-item-add', params: { id: it.id } } as any),
                              },
                              {
                                text: t('common.delete'),
                                style: 'destructive',
                                onPress: async () => {
                                  await deleteCustomItem(it.id);
                                  refresh();
                                },
                              },
                            ],
                          )
                      : undefined
                  }
                  style={[
                    styles.row,
                    i !== items.length - 1 && styles.rowDivider,
                  ]}>
                  <Text style={styles.rowTime}>{it.time}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[styles.rowTitle, done && styles.rowTitleDone]}>
                      {it.title}
                      {isCustom && <Text style={styles.customMark}>  ·</Text>}
                    </Text>
                    <Text style={styles.rowMeta}>{it.category} · {it.duration}</Text>
                  </View>
                  <View style={[styles.check, done && styles.checkDone]}>
                    {done && (
                      // Pop the check on completion — Reanimated springs the
                      // glyph in when `done` flips, so marking done feels
                      // physically earned instead of a flat toggle.
                      <Animated.View entering={ZoomIn.springify().damping(14).stiffness(220)}>
                        <Ionicons name="checkmark" size={14} color={colors.textOnBronze} />
                      </Animated.View>
                    )}
                  </View>
                </Pressable>
                </View>
              );
            })}
            <Pressable
              style={styles.addCustomRow}
              onPress={() => router.push('/plan-item-add' as any)}>
              <Ionicons name="add-circle-outline" size={18} color={colors.bronze} />
              <Text style={styles.addCustomText}>{t('plan.addCustom')}</Text>
            </Pressable>
          </Card>
        </View>

        {/* 28-day heat strip */}
        <View style={styles.heatCard}>
          <Eyebrow>{t('plan.last28')}</Eyebrow>
          <View style={styles.heatRow}>
            {last28.map((cnt, i) => {
              const ratio = items.length ? Math.min(1, cnt / items.length) : 0;
              const alpha = ratio === 0 ? 0.12 : 0.3 + ratio * 0.7;
              const date = lastNDates(28)[i];
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    // `YYYY-MM-DD` alone parses as UTC midnight → off-by-one
                    // for users west of UTC. Anchor at local midnight.
                    const label = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                    });
                    Alert.alert(label, `${cnt} / ${items.length}`);
                  }}
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor:
                        ratio === 0 ? colors.surfaceMuted : `rgba(176,138,90,${alpha})`,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Eyebrow>{t('plan.insightsTitle')}</Eyebrow>
          <View style={styles.insights}>
            <InsightLine icon="trending-up"     color={colors.positive} text={t('plan.insights.skinUp')} />
            <InsightLine icon="time-outline"    color={colors.bronze}   text={t('plan.insights.sleepStable')} />
            <InsightLine icon="warning-outline" color={colors.warning}  text={t('plan.insights.cardioMiss')} />
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function NextUpCard({
  items,
  doneToday,
  t,
}: {
  items: PlanItem[];
  doneToday: string[];
  t: (k: string, vars?: any) => string;
}) {
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const remaining = items
    .filter((it) => !doneToday.includes(it.id))
    .map((it) => {
      const [h, m] = it.time.split(':').map(Number);
      return { it, mins: h * 60 + m };
    })
    .filter((x) => x.mins >= minutesNow - 60)
    .sort((a, b) => a.mins - b.mins);

  const next = remaining[0];
  if (!next) {
    return (
      <View style={styles.nextDone}>
        <Ionicons name="checkmark-done" size={16} color={colors.positive} />
        <Text style={styles.nextDoneText}>{t('plan.nextDoneToday')}</Text>
      </View>
    );
  }

  const diff = next.mins - minutesNow;
  const when = diff <= 0
    ? t('plan.nextNow')
    : diff < 60
      ? t('plan.nextM', { m: diff })
      : t('plan.nextHM', { h: Math.floor(diff / 60), m: diff % 60 });

  return (
    <View style={styles.nextCard}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="time-outline" size={14} color={colors.bronze} />
          <Text style={styles.nextLabel}>{t('plan.nextUp')}</Text>
          <Text style={styles.nextWhen}>{diff <= 0 ? t('plan.nextNow') : t('plan.nextIn', { when })}</Text>
        </View>
        <Text style={styles.nextTitle}>{next.it.title}</Text>
        <Text style={styles.nextMeta}>{next.it.time} · {next.it.category} · {next.it.duration}</Text>
      </View>
    </View>
  );
}

function InsightLine({ icon, color, text }: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  color: string; text: string;
}) {
  return (
    <View style={styles.insightRow}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },

  field: { gap: 6 },
  chipsRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  chipText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 11.5, letterSpacing: 0.2 },
  chipTextActive: { color: colors.textOnBronze },
  saveTplLink: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.3 },

  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completed: { color: colors.bronze, fontFamily: type.family.sansSemi, fontSize: 12, letterSpacing: 0.3 },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  weekDay: { alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4, borderRadius: radius.sm, minWidth: 36 },
  weekDayActive: { backgroundColor: colors.bronzeOnBlack },
  weekLabel: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  weekLabelActive: { color: colors.bronze },
  weekDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.hairline },
  weekDotDone: { backgroundColor: colors.positive },
  weekDotToday: { backgroundColor: colors.bronze },
  weekDone: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 10 },

  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLink: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.3 },

  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  bucketHead: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 6,
  },
  bucketText: {
    color: colors.bronze,
    fontFamily: type.family.sansBlack,
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rowTime: { color: colors.bronze, fontFamily: type.family.sansSemi, fontSize: 12, letterSpacing: 0.4, width: 44 },
  rowTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 15 },
  rowTitleDone: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  rowMeta: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 12, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.bronze, borderColor: colors.bronze },

  insights: { gap: spacing.sm },
  insightRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  insightText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12.5, flex: 1 },

  nextCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.32)',
    gap: 6,
  },
  nextLabel: { color: colors.bronze, fontFamily: type.family.sansSemi, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  nextWhen: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.3, marginLeft: 'auto' },
  nextTitle: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 17, letterSpacing: type.letterSpacing.tight, marginTop: 4 },
  nextMeta: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12, marginTop: 2 },

  nextDone: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(126,158,122,0.35)',
    backgroundColor: 'rgba(126,158,122,0.06)',
  },
  nextDoneText: { color: colors.positive, fontFamily: type.family.sansMedium, fontSize: 13 },

  heatCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    gap: spacing.md,
  },
  heatRow: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  heatCell: { flex: 1, aspectRatio: 0.6, borderRadius: 3 },

  addCustomRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline,
  },
  addCustomText: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 13 },
  customMark: { color: colors.bronze, fontFamily: type.family.sansBold, fontSize: 14 },
});
