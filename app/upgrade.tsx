/**
 * Premium upsell — editorial pitch surface for JIGGO Pro.
 *
 * No StoreKit wiring yet (the user explicitly wants the app perfect first).
 * The "Start" button stubs to an Alert; when commerce ships, swap the stub
 * for `expo-iap` / native StoreKit 2 purchase flow per DEPLOY.md.
 *
 * Design intent: this screen has to read as "atelier", not "fitness sale".
 * Bronze gradient hero, six restrained benefit lines, three pricing tiers
 * — yearly anchored with a tasteful "Save 50%" badge, no flashing chevrons,
 * no countdowns, no social-proof testimonials. Premium = restraint.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { JMMark } from '@/components/JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useLanguage, useT } from '@/lib/i18n';
import { purchasePro, restorePro } from '@/lib/iap';
import en from '@/lib/i18n/en';
import de from '@/lib/i18n/de';

type Tier = 'weekly' | 'yearly' | 'lifetime';

const BENEFIT_KEYS = ['coach', 'rituals', 'insights', 'closet', 'sync', 'privacy'] as const;
const BENEFIT_ICONS: Record<typeof BENEFIT_KEYS[number], keyof typeof Ionicons.glyphMap> = {
  coach: 'sparkles-outline',
  rituals: 'leaf-outline',
  insights: 'analytics-outline',
  closet: 'shirt-outline',
  sync: 'cloud-offline-outline',
  privacy: 'lock-closed-outline',
};

export default function UpgradeScreen() {
  const t = useT();
  const { lang } = useLanguage();
  const [tier, setTier] = useState<Tier>('yearly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const faq: { q: string; a: string }[] = ((lang === 'de' ? de : en) as any).upgrade.faq ?? [];

  const onProActive = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert(t('upgrade.proActiveTitle'), t('upgrade.proActiveBody'), [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  // Real StoreKit 2 purchase via lib/iap. expo-iap surfaces a user-cancel as
  // an error — we swallow that one so cancelling never shows a failure alert.
  const start = async () => {
    if (busy) return;
    Haptics.selectionAsync().catch(() => {});
    setBusy(true);
    try {
      await purchasePro(tier);
      onProActive();
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (!/cancel/i.test(msg)) {
        Alert.alert(t('upgrade.purchaseFailedTitle'), msg || t('upgrade.purchaseFailedTitle'));
      }
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const entitlement = await restorePro();
      entitlement
        ? onProActive()
        : Alert.alert(t('upgrade.restoreNoneTitle'), t('upgrade.restoreNoneBody'));
    } catch (e: any) {
      Alert.alert(t('upgrade.purchaseFailedTitle'), String(e?.message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: t('upgrade.title') }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('upgrade.eyebrow')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1F1812', '#100A07', '#080606']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <JMMark size={44} />
          <Text style={styles.heroEyebrow}>{t('upgrade.eyebrow')}</Text>
          <Text style={styles.heroTitle}>{t('upgrade.heroTitle')}</Text>
          <Text style={styles.heroBody}>{t('upgrade.heroBody')}</Text>
        </LinearGradient>

        <View style={styles.benefits}>
          {BENEFIT_KEYS.map((k) => (
            <View key={k} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={BENEFIT_ICONS[k]} size={16} color={colors.bronze} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{t(`upgrade.benefits.${k}.title`)}</Text>
                <Text style={styles.benefitBody}>{t(`upgrade.benefits.${k}.body`)}</Text>
              </View>
            </View>
          ))}
        </View>

        <Eyebrow>{t('upgrade.pricingTitle')}</Eyebrow>

        <View style={styles.pricing}>
          <TierCard
            t={t}
            id="weekly"
            price="$4.99"
            unit={t('upgrade.perWeek')}
            note={t('upgrade.weeklyNote')}
            active={tier === 'weekly'}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); setTier('weekly'); }}
          />
          <TierCard
            t={t}
            id="yearly"
            badge={t('upgrade.yearlyBadge')}
            price="$39.99"
            unit={t('upgrade.perYear')}
            note={t('upgrade.yearlyNote')}
            active={tier === 'yearly'}
            highlight
            onPress={() => { Haptics.selectionAsync().catch(() => {}); setTier('yearly'); }}
          />
          <TierCard
            t={t}
            id="lifetime"
            price="$79.99"
            unit={t('upgrade.oneTime')}
            note={t('upgrade.lifetimeNote')}
            active={tier === 'lifetime'}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); setTier('lifetime'); }}
          />
        </View>

        <Pressable
          style={[styles.cta, busy && styles.ctaBusy]}
          onPress={start}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy }}
          accessibilityLabel={t('upgrade.startCta')}>
          {busy ? (
            <ActivityIndicator color={colors.textOnBronze} />
          ) : (
            <>
              <Text style={styles.ctaText}>{t('upgrade.startCta')}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textOnBronze} />
            </>
          )}
        </Pressable>

        <Text style={styles.fine}>{t('upgrade.fine')}</Text>

        <Pressable onPress={restore} disabled={busy} style={styles.byoLink}>
          <Ionicons name="refresh-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.byoText}>{t('upgrade.restore')}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/settings' as any)} style={styles.byoLink}>
          <Ionicons name="key-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.byoText}>{t('upgrade.byoLink')}</Text>
        </Pressable>

        {/* FAQ accordion — addresses the three highest-friction questions
            users have about subscriptions, in editorial voice. Tapping a
            row expands the answer; only one can be open at a time. */}
        {faq.length > 0 && (
          <View style={styles.faqWrap}>
            <Eyebrow>{t('upgrade.faqTitle')}</Eyebrow>
            {faq.map((item, i) => {
              const open = expandedFaq === i;
              return (
                <Pressable
                  key={i}
                  style={[styles.faqRow, open && styles.faqRowOpen]}
                  onPress={() => setExpandedFaq(open ? null : i)}
                  accessibilityRole="button"
                  accessibilityLabel={item.q}
                  accessibilityState={{ expanded: open }}>
                  <View style={styles.faqQ}>
                    <Text style={styles.faqQText}>{item.q}</Text>
                    <Ionicons
                      name={open ? 'remove' : 'add'}
                      size={16}
                      color={colors.bronze}
                    />
                  </View>
                  {open && <Text style={styles.faqA}>{item.a}</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TierCard({
  id,
  price,
  unit,
  note,
  active,
  highlight,
  badge,
  onPress,
  t,
}: {
  id: Tier;
  price: string;
  unit: string;
  note: string;
  active: boolean;
  highlight?: boolean;
  badge?: string;
  onPress: () => void;
  t: (k: string, v?: any) => string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tier,
        active && styles.tierActive,
        highlight && styles.tierHighlight,
      ]}
      accessibilityRole="radio"
      accessibilityLabel={`${price} ${unit}`}
      accessibilityState={{ selected: active }}>
      {badge && (
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>{badge}</Text>
        </View>
      )}
      <Text style={[styles.tierName, active && styles.tierNameActive]}>
        {t(`upgrade.tiers.${id}`)}
      </Text>
      <Text style={[styles.tierPrice, active && styles.tierPriceActive]}>{price}</Text>
      <Text style={styles.tierUnit}>{unit}</Text>
      <Text style={styles.tierNote}>{note}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' },

  content: { padding: spacing.xl, gap: spacing.xl },

  hero: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.30)',
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: colors.bronze,
    fontFamily: type.family.sansMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: type.letterSpacing.tighter,
  },
  heroBody: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: spacing.sm,
  },

  benefits: { gap: spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  benefitIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(176,138,90,0.10)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  benefitTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },
  benefitBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, lineHeight: 19, marginTop: 2 },

  pricing: { flexDirection: 'row', gap: 10 },
  tier: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    gap: 4,
    alignItems: 'center',
  },
  tierActive: {
    borderColor: colors.bronze,
    backgroundColor: 'rgba(176,138,90,0.07)',
  },
  tierHighlight: {
    borderColor: 'rgba(176,138,90,0.55)',
  },
  tierBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
  },
  tierBadgeText: {
    color: colors.textOnBronze,
    fontFamily: type.family.sansBlack,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  tierName: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  tierNameActive: { color: colors.bronze },
  tierPrice: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 22, letterSpacing: type.letterSpacing.tight, marginTop: 4 },
  tierPriceActive: { color: colors.textPrimary },
  tierUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  tierNote: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 10.5, lineHeight: 14, marginTop: 4, textAlign: 'center' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
  },
  ctaBusy: { opacity: 0.6 },
  ctaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 15, letterSpacing: 0.2 },

  fine: {
    color: colors.textTertiary,
    fontFamily: type.family.sans,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  byoLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  byoText: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11.5, letterSpacing: 0.2 },

  faqWrap: { gap: spacing.sm, marginTop: spacing.xl },
  faqRow: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  faqRowOpen: { borderColor: 'rgba(176,138,90,0.35)', backgroundColor: 'rgba(176,138,90,0.05)' },
  faqQ: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQText: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14, flex: 1, paddingRight: spacing.md },
  faqA: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 13,
    lineHeight: 19.5,
    marginTop: spacing.md,
  },
});
