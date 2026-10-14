import { Tabs } from 'expo-router';
import { Barbell, ChartPolar, Flame, ListChecks, Sun, type Icon } from 'phosphor-react-native';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const ICON = 24;

const TABS: { name: string; title: string; Icon: Icon }[] = [
  { name: 'today', title: 'Today', Icon: Sun },
  { name: 'tasks', title: 'Tasks', Icon: ListChecks },
  { name: 'habits', title: 'Habits', Icon: Flame },
  { name: 'fitness', title: 'Fitness', Icon: Barbell },
  { name: 'insights', title: 'Insights', Icon: ChartPolar },
];

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.ink,
        tabBarInactiveTintColor: t.colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fonts.label, fontSize: 11 },
        tabBarStyle: { backgroundColor: t.colors.surface, borderTopColor: t.colors.line },
      }}>
      {TABS.map(({ name, title, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // Fill weight marks the selected tab; regular weight for the rest.
            tabBarIcon: ({ focused }) => (
              <Icon
                size={ICON}
                color={focused ? t.colors.ink : t.colors.inkMuted}
                weight={focused ? 'fill' : 'regular'}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
