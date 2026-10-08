import { Tabs } from 'expo-router';
import { CoffeeIcon, ChartIcon, UserIcon } from '../../components/icons';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60, paddingBottom: 8 },
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.textDark, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Brews',
          tabBarIcon: ({ color }) => <CoffeeIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <ChartIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserIcon size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
