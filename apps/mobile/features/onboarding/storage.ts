import { ONBOARDING_STORAGE_KEY } from '@yemesek/legal';
import { Platform } from 'react-native';

export async function readIntroSeen(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(ONBOARDING_STORAGE_KEY) === '1';
    const secure = await import('expo-secure-store');
    return (await secure.getItemAsync(ONBOARDING_STORAGE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function writeIntroSeen(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(ONBOARDING_STORAGE_KEY, '1');
      return;
    }
    const secure = await import('expo-secure-store');
    await secure.setItemAsync(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    // Closing the screen still works for this launch.
  }
}
