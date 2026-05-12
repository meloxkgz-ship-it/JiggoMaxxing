import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { todayKey } from '@/lib/journal';
import { DEFAULT_PLAN, getCompletion, toggleComplete } from '@/lib/plan';

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

export default function PlanScreen() {
  const [doneToday, setDoneToday] = useState<string[]>([]);
  const [weekDone, setWeekDone] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const refresh = useCallback(async () => {
    const map = await getCompletion();
    const today = todayKey();
    setDoneToday(map[today] ?? []);
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

  const completed = doneToday.length;
  const total = DEFAULT_PLAN.length;
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
  const ratio = completed / total;

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow={`Week · ${completed}/${total} today`}
        title="Maxxing plan"
        subtitle="Disciplined, not punishing. Skip a day, not a system."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="elevated" style={{ gap: spacing.md }}>
          <View style={styles.weekHead}>
            <Eyebrow>This week</Eyebrow>
            <Text style={styles.completed}>{Math.round(ratio * 100)}% today</Text>
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
            <Eyebrow>Today · {new Date().toLocaleDateString(undefined, { weekday: 'long' })}</Eyebrow>
            <Text style={styles.sectionLink}>{completed} of {total} done</Text>
          </View>
          <Card variant="elevated" style={{ padding: 0 }}>
            {DEFAULT_PLAN.map((t, i) => {
              const done = doneToday.includes(t.id);
              return (
                <Pressable
                  key={t.id}
                  onPress={() => onToggle(t.id)}
                  style={[
                    styles.row,
                    i !== DEFAULT_PLAN.length - 1 && styles.rowDivider,
                  ]}>
                  <Text style={styles.rowTime}>{t.time}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[styles.rowTitle, done && styles.rowTitleDone]}>{t.title}</Text>
                    <Text style={styles.rowMeta}>{t.category} · {t.duration}</Text>
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
          <Eyebrow>Cycle 2 · what's working</Eyebrow>
          <View style={styles.insights}>
            <InsightLine icon="trending-up" color={colors.positive} text="Skin scores up 6% week-over-week" />
            <InsightLine icon="time-outline" color={colors.bronze} text="Average sleep climbed past 7h" />
            <InsightLine icon="warning-outline" color={colors.warning} text="Cardio missed twice — keep one easy day" />
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function InsightLine({
  icon,
  color,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
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
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  insightText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12.5, flex: 1 },
});
