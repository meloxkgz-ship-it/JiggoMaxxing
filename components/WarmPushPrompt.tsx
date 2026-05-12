import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Eyebrow } from './Eyebrow';
import { JMMark } from './JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useT } from '@/lib/i18n';

export function WarmPushPrompt({
  visible,
  onEnable,
  onLater,
}: {
  visible: boolean;
  onEnable: () => void;
  onLater: () => void;
}) {
  const t = useT();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onLater}>
      <Animated.View entering={FadeIn.duration(260)} style={styles.backdrop}>
        <Animated.View entering={FadeInUp.duration(360).springify()}>
          <View style={styles.card}>
            <JMMark size={48} />
            <Eyebrow>{t('home.nudge')}</Eyebrow>
            <Text style={styles.title}>{t('onboarding.notifyTitle')}</Text>
            <Text style={styles.body}>{t('onboarding.notifyBody')}</Text>
            <Pressable style={styles.cta} onPress={onEnable}>
              <Ionicons name="notifications-outline" size={16} color={colors.textOnBronze} />
              <Text style={styles.ctaText}>{t('onboarding.notifyEnable')}</Text>
            </Pressable>
            <Pressable onPress={onLater}>
              <Text style={styles.skip}>{t('onboarding.notifyLater')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,7,6,0.78)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.32)',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary, fontFamily: type.family.sansBlack,
    fontSize: 28, lineHeight: 32,
    letterSpacing: type.letterSpacing.tighter, marginTop: spacing.md,
  },
  body: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21, marginTop: 4 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: radius.pill, backgroundColor: colors.bronze,
    marginTop: spacing.lg,
  },
  ctaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
  skip: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
