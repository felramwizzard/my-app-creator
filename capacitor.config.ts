import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.myfinanceapp',
  appName: 'My Finance App',
  webDir: 'dist',
  server: {
    url: 'https://18a30e26-d8fd-4784-bbfe-6285fd98ef6b.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
