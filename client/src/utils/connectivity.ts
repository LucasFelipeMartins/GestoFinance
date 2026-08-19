import { Capacitor } from '@capacitor/core';

export type ConnectivityListener = (isOnline: boolean) => void;

/**
 * `navigator.onLine` is unreliable on native (reports true on a WiFi with no
 * real internet) — @capacitor/network gives a real signal there. On web we
 * fall back to the browser APIs.
 */
export async function isOnline(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    return status.connected;
  }
  return navigator.onLine;
}

export function subscribeConnectivity(listener: ConnectivityListener): () => void {
  if (Capacitor.isNativePlatform()) {
    let removeListener: (() => void) | undefined;
    import('@capacitor/network').then(({ Network }) => {
      Network.addListener('networkStatusChange', (status) => listener(status.connected)).then((handle) => {
        removeListener = () => handle.remove();
      });
    });
    return () => removeListener?.();
  }

  const onOnline = () => listener(true);
  const onOffline = () => listener(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
