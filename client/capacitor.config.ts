import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gestorpro.app',
  appName: 'GestorPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
