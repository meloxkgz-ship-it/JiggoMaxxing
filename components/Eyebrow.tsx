import { StyleSheet, Text, TextProps } from 'react-native';
import { colors, type } from '@/constants/jiggo-theme';

export function Eyebrow({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.eyebrow, style]} />;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: type.family.sansMedium,
    fontSize: type.size.eyebrow,
    letterSpacing: type.letterSpacing.eyebrow,
    color: colors.bronze,
    textTransform: 'uppercase',
  },
});
