import { Stack } from 'expo-router';
import { colors } from '../../../lib/theme';

// The My Brews and Coffees tabs are each a stack, so a brew or coffee opens inside the tab it was
// tapped in: the tab bar stays, and tapping the tab again goes back to its list. The brew and
// coffee screens are declared once, in this folder, which Expo Router makes part of both the
// (brews) and (coffees) groups. A link opened cold (a reload, a shared URL) lands in My Brews, the
// first group, with the list behind it.

export const unstable_settings = {
  anchor: 'index',
  coffees: { anchor: 'coffees' },
};

// The lists keep the look the tabs' own headers had
const listHeader = {
  headerStyle: { backgroundColor: colors.background },
  headerTitleStyle: { color: colors.textDark, fontWeight: '700' as const },
};

function stacked(title: string) {
  return { title, headerTintColor: colors.primary, headerBackButtonDisplayMode: 'minimal' as const };
}

export default function TabStackLayout({ segment }: { segment: string }) {
  return (
    <Stack>
      {segment === '(coffees)'
        ? <Stack.Screen name="coffees" options={{ title: 'Coffees', ...listHeader }} />
        : <Stack.Screen name="index" options={{ title: 'My Brews', ...listHeader }} />}
      <Stack.Screen name="brew/[id]" options={stacked('Brew Details')} />
      <Stack.Screen name="brew/new" options={stacked('Log a Brew')} />
      <Stack.Screen name="brew/edit/[id]" options={stacked('Edit Brew')} />
      <Stack.Screen name="brew/again/[id]" options={stacked('Brew Again')} />
      <Stack.Screen name="coffee/[id]" options={stacked('Coffee')} />
      <Stack.Screen name="coffee/new" options={stacked('Add a Coffee')} />
      <Stack.Screen name="coffee/edit/[id]" options={stacked('Edit Coffee')} />
    </Stack>
  );
}
