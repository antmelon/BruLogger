import { Tabs } from 'expo-router';
import { BagIcon, CoffeeIcon, ChartIcon, UserIcon } from '../../components/icons';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        // The bar is a fixed height, so its labels stay at their normal size (as iOS's own tab bars
        // do); everything else in the app follows the system text size
        tabBarAllowFontScaling: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60, paddingBottom: 8 },
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.textDark, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="(brews)"
        options={{
          title: 'My Brews',
          headerShown: false, // its stack has the header ((brews,coffees)/_layout.tsx)
          tabBarIcon: ({ color }) => <CoffeeIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(coffees)"
        options={{
          title: 'Coffees',
          headerShown: false,
          tabBarIcon: ({ color }) => <BagIcon size={22} color={color} />,
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
