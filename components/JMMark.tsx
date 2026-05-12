import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '@/constants/jiggo-theme';

export function JMMark({ size = 36 }: { size?: number }) {
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: radius.sm },
      ]}>
      <Text style={[styles.text, { fontSize: size * 0.45 }]}>JM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    borderWidth: 1,
    borderColor: colors.bronze,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.bronze,
    fontFamily: type.family.sansBlack,
    letterSpacing: 0.5,
  },
});
