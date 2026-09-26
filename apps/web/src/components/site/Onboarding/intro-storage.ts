import { ONBOARDING_STORAGE_KEY } from '@yemesek/legal';
import { COOKIE_STORAGE_KEY } from '@/components/site/CookieNotice/CookieNotice';

export function readIntroSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeIntroSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    // Private mode still closes the dialog for this view.
  }
}

export function hasCookieChoice(): boolean {
  try {
    return localStorage.getItem(COOKIE_STORAGE_KEY) != null;
  } catch {
    return false;
  }
}
