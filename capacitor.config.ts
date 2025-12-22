import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.lustmia.backlinks',
  appName: 'Lustmia Backlinks',
  webDir: 'www',  // Just a placeholder folder
  server: {
    url: 'https://backlinks.lustmia.com',
    cleartext: true
  }
};

export default config;