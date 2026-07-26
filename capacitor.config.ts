import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lustmia.backlinks",
  appName: "Lustmia Backlinks",
  webDir: "www",
  server: {
    url: "https://rankcore.ai",
    cleartext: false,
  },
};

export default config;
