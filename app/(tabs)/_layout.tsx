import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, type } from '@/constants/jiggo-theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IoniconName; iconFocused: IoniconName }[] = [
  { name: 'index',   title: 'Home',    icon: 'grid-outline',        iconFocused: 'grid' },
  { name: 'plan',    title: 'Plan',    icon: 'calendar-outline',    iconFocused: 'calendar' },
  { name: 'scan',    title: 'Scan',    icon: 'scan-outline',        iconFocused: 'scan' },
  { name: 'journal', title: 'Journal', icon: 'pulse-outline',       iconFocused: 'pulse' },
  { name: 'style',   title: 'Style',   icon: 'shirt-outline',       iconFocused: 'shirt' },
  { name: 'coach',   title: 'Coach',   icon: 'sparkles-outline',    iconFocused: 'sparkles' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.bronze,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontFamily: type.family.sansMedium,
          fontSize: 10,
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.barTint} />
          </BlurView>
        ),
        tabBarItemStyle: { paddingTop: 6 },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? t.iconFocused : t.icon} size={20} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    height: 68,
    borderTopWidth: 0,
    borderRadius: radius.xl,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  barTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.78)',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
});
