import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useT } from '@/lib/i18n';
import { addCustomItem, getCustomItem, updateCustomItem } from '@/lib/plan';
import { PlanItem } from '@/lib/types';

type Cat = PlanItem['category'];
const CATS: Cat[] = ['Grooming', 'Physique', 'Style', 'Mind'];

export default function PlanItemAddScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ?? null;
  const [title, setTitle] = useState('');
  const [hour, setHour] = useState('07');
  const [minute, setMinute] = useState('00');
  const [duration, setDuration] = useState('10m');
  const [category, setCategory] = useState<Cat>('Grooming');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const it = await getCustomItem(editId);
      if (!it) return;
      setTitle(it.title);
      const [h, m] = it.time.split(':');
      setHour(h ?? '07');
      setMinute(m ?? '00');
      setDuration(it.duration);
      setCategory(it.category);
    })();
  }, [editId]);

  const save = async () => {
    if (saving || !title.trim()) return;
    setSaving(true);
    const h = String(Math.max(0, Math.min(23, parseInt(hour, 10) || 7))).padStart(2, '0');
    const m = String(Math.max(0, Math.min(59, parseInt(minute, 10) || 0))).padStart(2, '0');
    const payload = {
      title: title.trim(),
      time: `${h}:${m}`,
      duration: duration.trim() || '10m',
      category,
    };
    if (editId) await updateCustomItem(editId, payload);
    else await addCustomItem(payload);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: t('plan.newItem') }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('plan.newItem')}</Text>
        <Pressable
          hitSlop={10}
          onPress={save}
          disabled={saving || !title.trim()}
          style={[styles.saveBtn, (saving || !title.trim()) && { opacity: 0.4 }]}>
          <Text style={styles.saveBtnText}>{saving ? t('common.saving') : t('common.save')}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Field label={t('plan.itemTitle')}>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('plan.itemTitlePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </Field>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Field label="Hour">
              <TextInput
                style={styles.input}
                value={hour}
                onChangeText={setHour}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="07"
                placeholderTextColor={colors.textTertiary}
              />
            </Field>
            <Field label="Min">
              <TextInput
                style={styles.input}
                value={minute}
                onChangeText={setMinute}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="00"
                placeholderTextColor={colors.textTertiary}
              />
            </Field>
            <Field label={t('plan.duration')}>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="10m"
                placeholderTextColor={colors.textTertiary}
              />
            </Field>
          </View>

          <Field label={t('plan.category')}>
            <View style={styles.row}>
              {CATS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setCategory(c); }}
                  style={[styles.chip, category === c && styles.chipActive]}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Eyebrow>{label}</Eyebrow>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 16 },
  saveBtn: { paddingHorizontal: spacing.lg, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.bronze },
  saveBtnText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 12, letterSpacing: 0.3 },

  content: { padding: spacing.xl, gap: spacing.xl },
  field: { gap: 4, flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    paddingHorizontal: spacing.lg, paddingVertical: 13, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surfaceElevated, color: colors.textPrimary,
    fontFamily: type.family.sansMedium, fontSize: 15,
  },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  chipText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12 },
  chipTextActive: { color: colors.textOnBronze },
});
