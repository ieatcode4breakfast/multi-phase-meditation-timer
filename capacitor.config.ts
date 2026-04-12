import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ieatcode4breakfast.meditationtimer',
  appName: 'Meditation Timer',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
