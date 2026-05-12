import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eyebrow } from './Eyebrow';
import { colors, spacing, type } from '@/constants/jiggo-theme';

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.wrap}>
      <View style={styles.inner}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.ink },
  inner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: type.size.displayLg - 8,
    lineHeight: (type.size.displayLg - 8) * 1.0,
    letterSpacing: type.letterSpacing.tighter,
    marginTop: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: type.size.body,
    lineHeight: 22,
    marginTop: 4,
  },
});
