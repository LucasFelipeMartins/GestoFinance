import { Capacitor } from '@capacitor/core';

const TOKEN_KEY = 'gestorpro_token';

/**
 * Only used on native (Capacitor). Web relies entirely on the httpOnly
 * cookie — cross-site cookies from inside a WebView aren't reliable across
 * Android versions/OEMs, so the native app authenticates with a bearer
 * token instead, persisted here.
 */
export async function getToken(): Promise<string | undefined> {
  if (!Capacitor.isNativePlatform()) return undefined;
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value ?? undefined;
}

export async function setToken(token: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key: TOKEN_KEY, value: token });
}

export async function clearToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.remove({ key: TOKEN_KEY });
}
