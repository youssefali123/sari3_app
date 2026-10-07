// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  // Feature 010 (SC-004 / FR-024): the motion layer imports presentation-level
  // libraries only — business, server-state, data-fetching, and domain layers
  // are banned at lint level, not by convention.
  {
    files: ["src/shared/ui/motion/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*", "@/features/**"], message: "Motion layer must not import business features (FR-024)." },
            { group: ["@/shared/lib/*", "@/shared/lib/**"], message: "Motion layer must not import the data/store layer (FR-024)." },
            { group: ["react-redux", "@reduxjs/*", "@reduxjs/toolkit"], message: "Motion owns no Redux state (FR-024)." },
            { group: ["@tanstack/*", "@tanstack/react-query"], message: "Motion owns no server state (FR-024)." },
            { group: ["expo-router"], message: "Motion must not navigate; transitions expose screenOptions only (FR-024)." },
            { group: ["expo-haptics"], message: "Haptics go through @/shared/ui/utils/haptics (FR-020)." },
          ],
        },
      ],
    },
  },
]);
