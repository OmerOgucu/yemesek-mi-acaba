const { getDefaultConfig } = require('expo/metro-config');

// SDK 53 already watches this pnpm workspace and sets nodeModulesPaths from the
// git root. Replacing those arrays made Metro resolve the app from the wrong
// root (the failure mode behind EXPO_NO_METRO_WORKSPACE_ROOT workarounds).
const config = getDefaultConfig(__dirname);

module.exports = config;
