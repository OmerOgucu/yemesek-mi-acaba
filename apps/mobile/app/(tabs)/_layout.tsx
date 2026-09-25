import { Tabs } from 'expo-router';
import { Image } from 'react-native';
import logo from '../../assets/brand/logo.png';
import { colors } from '../../features/theme/theme';

function BrandTitle() {
  return (
    <Image
      source={logo}
      style={{ width: 168, height: 46 }}
      resizeMode="contain"
      accessibilityLabel="Yemesek Mi Acaba?"
    />
  );
}

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
      <Tabs.Screen name="index" options={{ title: 'Liste', headerTitle: () => <BrandTitle /> }} />
      <Tabs.Screen name="mekan" options={{ title: 'Mekan' }} />
      <Tabs.Screen name="sikayet" options={{ title: 'Şikayet' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
