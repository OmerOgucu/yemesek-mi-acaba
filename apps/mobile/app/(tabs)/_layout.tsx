import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Image } from 'react-native';
import logo from '../../assets/brand/logo.png';
import { colors } from '../../features/theme/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

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

function tabIcon(name: IonName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
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
      <Tabs.Screen
        name="index"
        options={{ title: 'Liste', headerTitle: () => <BrandTitle />, tabBarIcon: tabIcon('list-outline') }}
      />
      <Tabs.Screen name="mekan" options={{ title: 'Mekan', tabBarIcon: tabIcon('storefront-outline') }} />
      <Tabs.Screen name="sikayet" options={{ title: 'Şikayet', tabBarIcon: tabIcon('alert-circle-outline') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: tabIcon('person-outline') }} />
    </Tabs>
  );
}
