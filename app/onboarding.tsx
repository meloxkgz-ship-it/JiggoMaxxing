import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { JMMark } from '@/components/JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { LANGUAGES, useLanguage, useT } from '@/lib/i18n';
import { seedStarterPlanFromGoals } from '@/lib/plan';
import { saveSettings } from '@/lib/settings';

const STEPS = ['intro', 'pact', 'goals', 'experience', 'tour', 'profile'] as const;
type Step = typeof STEPS[number];

const GOALS: { v: 'grooming' | 'physique' | 'style' | 'confidence' | 'discipline'; icon: any }[] = [
  { v: 'grooming',   icon: 'water-outline' },
  { v: 'physique',   icon: 'barbell-outline' },
  { v: 'style',      icon: 'shirt-outline' },
  { v: 'confidence', icon: 'flame-outline' },
  { v: 'discipline', icon: 'compass-outline' },
];

const EXP: ('beginner' | 'returning' | 'advanced')[] = ['beginner', 'returning', 'advanced'];

const TOUR_ITEMS = [
  { k: 'Home',    icon: 'grid-outline'     as const, key: 'tourHome' },
  { k: 'Plan',    icon: 'calendar-outline' as const, key: 'tourPlan' },
  { k: 'Scan',    icon: 'scan-outline'     as const, key: 'tourScan' },
  { k: 'Journal', icon: 'pulse-outline'    as const, key: 'tourJournal' },
  { k: 'Style',   icon: 'shirt-outline'    as const, key: 'tourStyle' },
  { k: 'Coach',   icon: 'sparkles-outline' as const, key: 'tourCoach' },
];

export default function OnboardingScreen() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [goals, setGoals] = useState<('grooming'|'physique'|'style'|'confidence'|'discipline')[]>([]);
  const [experience, setExperience] = useState<'beginner'|'returning'|'advanced'>('beginner');

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const back = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const toggleGoal = (g: typeof goals[number]) => {
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const finish = async () => {
    await saveSettings({
      name: name.trim() || undefined,
      goalKg: goal ? parseFloat(goal) : undefined,
      goals: goals.length ? goals : undefined,
      experience,
      hasOnboarded: true,
    });
    // Seed a personalized plan from selected goals so Home isn't empty on first run.
    if (goals.length > 0) {
      await seedStarterPlanFromGoals(goals, t('plan.yourEdgeTemplate'));
    }
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#1A1411', '#080606']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.topRow}>
              {STEPS.indexOf(step) > 0 ? (
                <Pressable hitSlop={10} onPress={back} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                </Pressable>
              ) : (
                <View style={{ width: 24 }} />
              )}
              <View style={styles.progress}>
                {STEPS.map((s, i) => {
                  const idx = STEPS.indexOf(step);
                  return (
                    <View
                      key={s}
                      style={[styles.progressDot, i <= idx ? styles.progressDotActive : null]}
                    />
                  );
                })}
              </View>
              <View style={styles.langRow}>
                {LANGUAGES.map((l) => (
                  <Pressable
                    key={l.code}
                    onPress={() => setLang(l.code)}
                    style={[styles.langChip, lang === l.code && styles.langChipActive]}>
                    <Text style={[styles.langText, lang === l.code && styles.langTextActive]}>
                      {l.code.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <JMMark size={56} />

            {step === 'intro' && (
              <>
                <Eyebrow>{t('onboarding.welcome')}</Eyebrow>
                <Text style={styles.title}>{t('onboarding.title1')}</Text>
                <Text style={styles.body}>{t('onboarding.body1')}</Text>
                <Feature icon="lock-closed-outline" title={t('onboarding.f1')} body={t('onboarding.f1b')} />
                <Feature icon="scan-outline"        title={t('onboarding.f2')} body={t('onboarding.f2b')} />
                <Feature icon="sparkles-outline"    title={t('onboarding.f3')} body={t('onboarding.f3b')} />
                <Pressable style={styles.cta} onPress={next}>
                  <Text style={styles.ctaText}>{t('common.continue')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnBronze} />
                </Pressable>
              </>
            )}

            {step === 'pact' && (
              <>
                <Eyebrow>{t('onboarding.pact')}</Eyebrow>
                <Text style={styles.title}>{t('onboarding.title2')}</Text>
                <View style={styles.pactList}>
                  <Pact text={t('onboarding.p1')} />
                  <Pact text={t('onboarding.p2')} />
                  <Pact text={t('onboarding.p3')} />
                  <Pact text={t('onboarding.p4')} />
                </View>
                <Text style={styles.bodyMuted}>{t('onboarding.pactFooter')}</Text>
                <Pressable style={styles.cta} onPress={next}>
                  <Text style={styles.ctaText}>{t('onboarding.agree')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnBronze} />
                </Pressable>
              </>
            )}

            {step === 'tour' && (
              <>
                <Eyebrow>{t('onboarding.tour')}</Eyebrow>
                <Text style={styles.title}>{t('onboarding.title4')}</Text>
                <Text style={styles.body}>{t('onboarding.body4')}</Text>
                <View style={styles.tourGrid}>
                  {TOUR_ITEMS.map((it) => (
                    <View key={it.k} style={styles.tourCard}>
                      <View style={styles.tourIcon}>
                        <Ionicons name={it.icon} size={16} color={colors.bronze} />
                      </View>
                      <Text style={styles.tourTitle}>{t(`onboarding.${it.key}` as any)}</Text>
                      <Text style={styles.tourBody}>{t(`onboarding.${it.key}Body` as any)}</Text>
                    </View>
                  ))}
                </View>
                <Pressable style={styles.cta} onPress={next}>
                  <Text style={styles.ctaText}>{t('common.continue')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnBronze} />
                </Pressable>
              </>
            )}

            {step === 'goals' && (
              <>
                <Eyebrow>{t('onboarding.tour')}</Eyebrow>
                <Text style={styles.title}>{t('onboarding.goalsTitle')}</Text>
                <Text style={styles.body}>{t('onboarding.goalsBody')}</Text>
                <View style={styles.tourGrid}>
                  {GOALS.map((g) => {
                    const on = goals.includes(g.v);
                    return (
                      <Pressable
                        key={g.v}
                        onPress={() => toggleGoal(g.v)}
                        style={[styles.tourCard, on && styles.goalCardOn]}>
                        <View style={styles.tourIcon}>
                          <Ionicons name={g.icon} size={18} color={on ? colors.textOnBronze : colors.bronze} />
                        </View>
                        <Text style={[styles.tourTitle, on && { color: colors.textOnBronze }]}>
                          {t(`coach.topicCards.${g.v}.title`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  style={[styles.cta, goals.length === 0 && { opacity: 0.5 }]}
                  disabled={goals.length === 0}
                  onPress={next}>
                  <Text style={styles.ctaText}>{t('common.continue')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnBronze} />
                </Pressable>
              </>
            )}

            {step === 'experience' && (
              <>
                <Eyebrow>{t('common.private')}</Eyebrow>
                <Text style={styles.title}>{t('onboarding.experienceTitle')}</Text>
                <Text style={styles.body}>{t('onboarding.experienceBody')}</Text>
                <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
                  {EXP.map((e) => {
                    const on = experience === e;
                    return (
                      <Pressable
                        key={e}
                        onPress={() => setExperience(e)}
                        style={[styles.expRow, on && styles.expRowOn]}>
                        <Text style={[styles.expText, on && { color: colors.textOnBronze }]}>
                          {t(`onboarding.exp${e[0].toUpperCase()}${e.slice(1)}` as any)}
                        </Text>
                        {on && <Ionicons name="checkmark" size={18} color={colors.textOnBronze} />}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable style={styles.cta} onPress={next}>
                  <Text style={styles.ctaText}>{t('common.continue')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnBronze} />
                </Pressable>
              </>
            )}

            {step === 'profile' && (
              <>
                <Eyebrow>{t('common.optional')}</Eyebrow>
                <Text style={styles.title}>{t('onboarding.title3')}</Text>
                <Text style={styles.body}>{t('onboarding.body3')}</Text>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('onboarding.firstName')}</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    placeholder={t('common.optional')}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('settings.goalKg')}</Text>
                  <TextInput
                    value={goal}
                    onChangeText={setGoal}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder={t('common.optional')}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <Pressable style={styles.cta} onPress={finish}>
                  <Text style={styles.ctaText}>{t('onboarding.enter')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnBronze} />
                </Pressable>
                <Pressable onPress={finish}>
                  <Text style={styles.skip}>{t('onboarding.skipForNow')}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Feature({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={16} color={colors.bronze} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

function Pact({ text }: { text: string }) {
  return (
    <View style={styles.pactRow}>
      <Ionicons name="close-circle-outline" size={16} color={colors.bronze} />
      <Text style={styles.pactText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },

  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.lg,
  },
  backBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 8, flex: 1 },
  progressDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.hairline },
  progressDotActive: { backgroundColor: colors.bronze },
  langRow: { flexDirection: 'row', gap: 6 },
  langChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  langChipActive: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  langText: { color: colors.textTertiary, fontFamily: type.family.sansBold, fontSize: 10.5, letterSpacing: 0.5 },
  langTextActive: { color: colors.textOnBronze },

  title: {
    color: colors.textPrimary, fontFamily: type.family.sansBlack,
    fontSize: 38, lineHeight: 42, letterSpacing: type.letterSpacing.tighter, marginTop: spacing.md,
  },
  body: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 14.5, lineHeight: 22, marginTop: spacing.sm },
  bodyMuted: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 13.5, lineHeight: 20, marginTop: spacing.md },

  feature: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginTop: spacing.md },
  featureIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bronzeOnBlack, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },
  featureBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, lineHeight: 19, marginTop: 2 },

  tourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  tourCard: {
    flexBasis: '47%', flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    gap: 4,
  },
  tourIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.bronzeOnBlack,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  tourTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13 },
  tourBody: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 11.5, lineHeight: 17 },
  goalCardOn: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  expRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  expRowOn: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  expText: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },

  pactList: { gap: spacing.sm, marginTop: spacing.lg },
  pactRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    backgroundColor: colors.bronzeOnBlack,
  },
  pactText: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 13, flex: 1, lineHeight: 19 },

  field: { gap: 6, marginTop: spacing.lg },
  fieldLabel: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    paddingHorizontal: spacing.lg, paddingVertical: 13, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 15,
  },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, backgroundColor: colors.bronze, borderRadius: radius.pill, marginTop: spacing.xl,
  },
  ctaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
  skip: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 13, textAlign: 'center', marginTop: spacing.md },
});
