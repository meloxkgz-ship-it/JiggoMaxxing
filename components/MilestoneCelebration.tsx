import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Eyebrow } from './Eyebrow';
import { JMMark } from './JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useT } from '@/lib/i18n';

export function MilestoneCelebration({
  milestone,
  onDismiss,
}: {
  milestone: number | null;
  onDismiss: () => void;
}) {
  const t = useT();
  if (milestone == null) return null;

  const body = t(`home.milestone${milestone}` as any);
  const title = t('home.milestoneTitle', { n: milestone });

  return (
    <Modal
      transparent
      animationType="fade"
      visible={milestone != null}
      onRequestClose={onDismiss}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.backdrop}>
        <Animated.View entering={FadeInUp.duration(420).springify()}>
          <LinearGradient
            colors={['#231A12', '#0E0B09']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}>
            <JMMark size={56} />
            <Eyebrow>{t('home.nudge')} · streak</Eyebrow>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            <Pressable style={styles.cta} onPress={onDismiss}>
              <Text style={styles.ctaText}>{t('home.dismiss')}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.textOnBronze} />
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,7,6,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.34)',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: type.letterSpacing.tighter,
    marginTop: spacing.md,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
    marginTop: spacing.lg,
  },
  ctaText: {
    color: colors.textOnBronze,
    fontFamily: type.family.sansSemi,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
