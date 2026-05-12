import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useT } from '@/lib/i18n';
import { todayKey } from '@/lib/journal';
import {
  getActivePlan,
  getActiveTemplate,
  getCompletion,
  PlanTemplate,
  PLAN_TEMPLATES,
  setActiveTemplate,
  toggleComplete,
} from '@/lib/plan';
import { PlanItem } from '@/lib/types';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function lastNDates(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const TEMPLATES: PlanTemplate[] = ['foundations', 'disciplined', 'lean', 'travel'];

export default function PlanScreen() {
  const t = useT();
  const [tpl, setTpl] = useState<PlanTemplate>('foundations');
  const [items, setItems] = useState<PlanItem[]>([]);
  const [doneToday, setDoneToday] = useState<string[]>([]);
  const [weekDone, setWeekDone] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const refresh = useCallback(async () => {
    const [t, plan, map] = await Promise.all([
      getActiveTemplate(),
      getActivePlan(),
      getCompletion(),
    ]);
    setTpl(t);
    setItems(plan);
    setDoneToday(map[todayKey()] ?? []);
    const week = lastNDates(7);
    setWeekDone(week.map((d) => (map[d] ?? []).length));
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onToggle = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = await toggleComplete(id);
    setDoneToday(next);
    refresh();
  };

  const switchTpl = async (v: PlanTemplate) => {
    Haptics.selectionAsync().catch(() => {});
    await setActiveTemplate(v);
    setTpl(v);
    setItems(PLAN_TEMPLATES[v]);
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Template switcher */}
        <View style={styles.field}>
          <Eyebrow>{t('plan.template')}</Eyebrow>
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
              return (
                <Pressable
                  key={it.id}
                  onPress={() => onToggle(it.id)}
                  style={[
                    styles.row,
                    i !== items.length - 1 && styles.rowDivider,
                  ]}>
                  <Text style={styles.rowTime}>{it.time}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[styles.rowTitle, done && styles.rowTitleDone]}>{it.title}</Text>
                    <Text style={styles.rowMeta}>{it.category} · {it.duration}</Text>
                  </View>
                  <View style={[styles.check, done && styles.checkDone]}>
                    {done && <Ionicons name="checkmark" size={14} color={colors.textOnBronze} />}
                  </View>
                </Pressable>
              );
            })}
          </Card>
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
});
