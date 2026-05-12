import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, type } from '@/constants/jiggo-theme';
import { useT } from '@/lib/i18n';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; key: string; icon: IoniconName; iconFocused: IoniconName }[] = [
  { name: 'index',   key: 'home',    icon: 'grid-outline',     iconFocused: 'grid' },
  { name: 'plan',    key: 'plan',    icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'scan',    key: 'scan',    icon: 'scan-outline',     iconFocused: 'scan' },
  { name: 'journal', key: 'journal', icon: 'pulse-outline',    iconFocused: 'pulse' },
  { name: 'style',   key: 'style',   icon: 'shirt-outline',    iconFocused: 'shirt' },
  { name: 'coach',   key: 'coach',   icon: 'sparkles-outline', iconFocused: 'sparkles' },
];

export default function TabsLayout() {
  const t = useT();
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
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.key}`),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={20} color={color} />
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
