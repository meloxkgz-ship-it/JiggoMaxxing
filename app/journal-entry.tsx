import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useLanguage, useT } from '@/lib/i18n';
import en from '@/lib/i18n/en';
import de from '@/lib/i18n/de';
import { addEntry, todayKey } from '@/lib/journal';
import { Mood } from '@/lib/types';

const MOODS: { v: Mood; icon: keyof typeof Ionicons.glyphMap }[] = [
  { v: 'sharp',     icon: 'flash-outline' },
  { v: 'even',      icon: 'remove-outline' },
  { v: 'foggy',     icon: 'cloud-outline' },
  { v: 'low',       icon: 'water-outline' },
  { v: 'wired',     icon: 'pulse-outline' },
  { v: 'motivated', icon: 'rocket-outline' },
  { v: 'restless',  icon: 'shuffle-outline' },
];

export default function JournalEntryScreen() {
  const t = useT();
  const { lang } = useLanguage();
  // Show evening reflection prompts after 18:00 local — encourages the
  // stoic end-of-day review without forcing it on a morning journaler.
  const showEveningPrompts = new Date().getHours() >= 18;
  const eveningPrompts: string[] = ((lang === 'de' ? de : en) as any).journal.eveningPrompts ?? [];
  const [weight, setWeight] = useState('');
  const [sleep, setSleep] = useState('');
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    // parseFloat('.') / parseFloat('abc') return NaN — Number.isFinite gates
    // it out so a bad input doesn't poison the sparkline + 7-day average.
    const w = parseFloat(weight);
    const s = parseFloat(sleep);
    await addEntry({
      date: todayKey(),
      weightKg: Number.isFinite(w) && w > 0 ? w : undefined,
      sleepHours: Number.isFinite(s) && s >= 0 ? s : undefined,
      mood,
      notes: notes.trim(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: t('journal.newEntry') }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('journal.newEntry')}</Text>
        <Pressable
          hitSlop={10}
          onPress={save}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
          <Text style={styles.saveBtnText}>{saving ? t('common.saving') : t('common.save')}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Eyebrow>
              {t('common.today')} · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </Eyebrow>

            <View style={styles.row}>
              <Field label={t('journal.weight')}>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="78.4"
                  placeholderTextColor={colors.textTertiary}
                />
              </Field>
              <Field label={t('journal.sleep')}>
                <TextInput
                  style={styles.input}
                  value={sleep}
                  onChangeText={setSleep}
                  keyboardType="decimal-pad"
                  placeholder="7.5"
                  placeholderTextColor={colors.textTertiary}
                />
              </Field>
            </View>

            <Field label={t('journal.mood')}>
              <View style={styles.moodRow}>
                {MOODS.map((m) => (
                  <Pressable
                    key={m.v}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setMood(mood === m.v ? undefined : m.v);
                    }}
                    style={[styles.moodChip, mood === m.v && styles.moodChipActive]}>
                    <Ionicons name={m.icon} size={14} color={mood === m.v ? colors.textOnBronze : colors.bronze} />
                    <Text style={[styles.moodText, mood === m.v && styles.moodTextActive]}>
                      {t(`journal.moods.${m.v}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            {showEveningPrompts && eveningPrompts.length > 0 && (
              <View style={styles.promptsCard}>
                <Text style={styles.promptsTitle}>{t('journal.eveningPromptsTitle')}</Text>
                {eveningPrompts.map((p, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      // Append the prompt to the notes if it isn't already there.
                      const line = `${p} `;
                      if (!notes.endsWith(line)) {
                        setNotes(notes ? `${notes.trim()}\n\n${p} ` : `${p} `);
                      }
                    }}
                    style={styles.promptRow}>
                    <View style={styles.promptDot} />
                    <Text style={styles.promptText}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Field label={t('journal.notes')}>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('journal.notesPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
            </Field>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 16 },
  saveBtn: { paddingHorizontal: spacing.lg, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.bronze },
  saveBtnText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 12, letterSpacing: 0.3 },

  content: { padding: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1, gap: 4 },
  fieldLabel: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    paddingHorizontal: spacing.lg, paddingVertical: 13, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surfaceElevated, color: colors.textPrimary,
    fontFamily: type.family.sansMedium, fontSize: 15,
  },
  notesInput: { minHeight: 160, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21 },

  promptsCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(176,138,90,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.22)',
    gap: 10,
  },
  promptsTitle: {
    color: colors.bronze,
    fontFamily: type.family.sansMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  promptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  promptDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.bronze, marginTop: 8 },
  promptText: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: type.family.sans,
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 19,
  },

  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface,
  },
  moodChipActive: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  moodText: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 12.5, letterSpacing: 0.2 },
  moodTextActive: { color: colors.textOnBronze },
});
