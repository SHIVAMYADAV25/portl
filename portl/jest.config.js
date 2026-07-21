module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-webview|react-native-qrcode-svg|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context)",
  ],
  setupFiles: ["<rootDir>/test-utils/jestSetup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.tsx", "**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
};
