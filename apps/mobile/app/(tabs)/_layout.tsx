import { Tabs } from 'expo-router';
import { colors } from '../../src/theme/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.chili,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Liste' }} />
      <Tabs.Screen name="mekan" options={{ title: 'Mekan' }} />
      <Tabs.Screen name="sikayet" options={{ title: 'Şikayet' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
