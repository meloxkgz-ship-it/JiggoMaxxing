import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/constants/jiggo-theme';

type Variant = 'default' | 'elevated' | 'outline';

export function Card({
  style,
  variant = 'default',
  ...rest
}: ViewProps & { variant?: Variant }) {
  return <View {...rest} style={[styles.base, styles[variant], style]} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  default: {
    backgroundColor: colors.surface,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
});
