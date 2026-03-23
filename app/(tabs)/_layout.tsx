import { Tabs } from 'expo-router';
import { CoffeeIcon, ChartIcon, UserIcon } from '../../components/icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8B5A2B',
        tabBarInactiveTintColor: '#B0A090',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E8DFCF' },
        headerStyle: { backgroundColor: '#F5EFE6' },
        headerTitleStyle: { color: '#4A3728', fontWeight: '700' },
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
