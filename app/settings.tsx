import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
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
import { clearHistory } from '@/lib/coach';
import { LANGUAGES, useLanguage, useT } from '@/lib/i18n';
import { getApiKey, getSettings, saveSettings, setApiKey } from '@/lib/settings';
import { wipeAll } from '@/lib/storage';
import { Settings } from '@/lib/types';

export default function SettingsScreen() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    (async () => {
      const [s, k] = await Promise.all([getSettings(), getApiKey()]);
      setSettings(s);
      setHasKey(!!k);
      if (k) setKeyDraft(k);
    })();
  }, []);

  if (!settings) return null;

  const update = async (patch: Partial<Settings>) => {
    const next = await saveSettings(patch);
    setSettings(next);
  };

  const saveKey = async () => {
    setKeyStatus('saving');
    await setApiKey(keyDraft.trim() || null);
    setHasKey(!!keyDraft.trim());
    setKeyStatus('saved');
    setTimeout(() => setKeyStatus('idle'), 1200);
  };

  const resetCoach = () => {
    Alert.alert(t('coach.clearTitle'), t('coach.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => clearHistory() },
    ]);
  };

  const resetAll = () => {
    Alert.alert(t('settings.resetTitle'), t('settings.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await wipeAll();
          await setApiKey(null);
          router.replace('/onboarding' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title={t('settings.profile')}>
          <Field label={t('settings.name')}>
            <TextInput
              style={styles.input}
              value={settings.name ?? ''}
              onChangeText={(v) => update({ name: v })}
              placeholder={t('common.optional')}
              placeholderTextColor={colors.textTertiary}
            />
          </Field>
          <Field label={t('settings.goalKg')}>
            <TextInput
              style={styles.input}
              value={settings.goalKg?.toString() ?? ''}
              keyboardType="decimal-pad"
              onChangeText={(v) => update({ goalKg: v ? parseFloat(v) : undefined })}
              placeholder={t('common.optional')}
              placeholderTextColor={colors.textTertiary}
            />
          </Field>
          <Field label={t('settings.units')} inline>
            <View style={styles.segment}>
              {(['metric', 'imperial'] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => update({ units: u })}
                  style={[styles.seg, settings.units === u && styles.segActive]}>
                  <Text style={[styles.segText, settings.units === u && styles.segTextActive]}>
                    {t(`settings.${u}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
        </Section>

        <Section title={t('settings.language')}>
          <View style={styles.segment}>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => setLang(l.code)}
                style={[styles.seg, lang === l.code && styles.segActive]}>
                <Text style={[styles.segText, lang === l.code && styles.segTextActive]}>
                  {l.native}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title={t('settings.coach')} subtitle={t('settings.coachSub')}>
          <View style={styles.keyRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={keyDraft}
              onChangeText={setKeyDraft}
              placeholder={t('settings.apiKeyPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!keyVisible}
            />
            <Pressable hitSlop={6} onPress={() => setKeyVisible((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={keyVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={saveKey}>
              <Text style={styles.btnPrimaryText}>
                {keyStatus === 'saving' ? t('common.saving') : keyStatus === 'saved' ? `${t('common.saved')} ✓` : hasKey ? t('settings.updateKey') : t('settings.saveKey')}
              </Text>
            </Pressable>
            {hasKey && (
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={async () => {
                setKeyDraft('');
                await setApiKey(null);
                setHasKey(false);
              }}>
                <Text style={styles.btnGhostText}>{t('settings.removeKey')}</Text>
              </Pressable>
            )}
          </View>
          <Pressable style={styles.linkRow} onPress={resetCoach}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.linkText}>{t('settings.clearHistoryLink')}</Text>
          </Pressable>
        </Section>

        <Section title={t('settings.privacy')} subtitle={t('settings.privacyBody')}>
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.bronze} />
            <Text style={styles.privacyText}>{t('settings.privacyPledge')}</Text>
          </View>
        </Section>

        <Section title={t('settings.about')}>
          <Pressable
            style={styles.whyRow}
            onPress={() => router.push('/why' as any)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.whyTitle}>{t('settings.why')}</Text>
              <Text style={styles.whySub}>{t('settings.whySub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
          <InfoRow label={t('settings.version')} value="1.2.0" />
          <InfoRow label={t('settings.build')} value="iOS · React Native" />
          <InfoRow label={t('settings.tone')} value={t('app.motto')} />
        </Section>

        <Section title={t('settings.danger')}>
          <Pressable style={styles.dangerBtn} onPress={resetAll}>
            <Ionicons name="warning-outline" size={16} color={colors.danger} />
            <Text style={styles.dangerText}>{t('settings.resetAll')}</Text>
          </Pressable>
        </Section>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Eyebrow>{title}</Eyebrow>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>{children}</View>
    </View>
  );
}

function Field({ label, children, inline = false }: { label: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <View style={[styles.field, inline && { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={inline ? undefined : { marginTop: 6 }}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.xxl },

  section: { gap: spacing.sm },
  sectionSubtitle: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 12.5, lineHeight: 18 },

  field: { gap: 4 },
  fieldLabel: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surfaceElevated, color: colors.textPrimary,
    fontFamily: type.family.sansMedium, fontSize: 14,
  },

  segment: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  segActive: { backgroundColor: colors.bronze },
  segText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 11 },
  segTextActive: { color: colors.textOnBronze },

  keyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyeBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surfaceElevated,
  },
  btn: { paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: radius.pill, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.bronze, flex: 1 },
  btnPrimaryText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.2 },
  btnGhost: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface },
  btnGhostText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 13 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md },
  linkText: { color: colors.danger, fontFamily: type.family.sansMedium, fontSize: 13 },

  privacyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: spacing.lg, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    backgroundColor: colors.bronzeOnBlack,
  },
  privacyText: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 12.5, flex: 1, lineHeight: 18 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline,
  },
  infoLabel: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 13 },
  infoValue: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 13 },

  whyRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 14, paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    backgroundColor: colors.bronzeOnBlack,
  },
  whyTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },
  whySub: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12, marginTop: 2 },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.danger,
    backgroundColor: 'rgba(176,88,79,0.08)',
  },
  dangerText: { color: colors.danger, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.2 },
});
