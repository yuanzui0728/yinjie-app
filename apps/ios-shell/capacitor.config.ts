import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yinjie.ios",
  appName: "隐界",
  webDir: "../app/dist",
  bundledWebRuntime: false,
  ios: {
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#070c14",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#070c14",
    },
  },
  server: {
    androidScheme: "https",
    hostname: "app.yinjie.local",
  },
};

export default config;
