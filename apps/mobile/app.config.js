const app = require('./app.json');

function apiUrl() {
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
}

/** http API URLs need cleartext. An https production build does not. */
module.exports = () => {
  const httpApi = apiUrl().startsWith('http://');
  const expo = app.expo;
  return {
    expo: {
      ...expo,
      android: {
        ...expo.android,
        usesCleartextTraffic: httpApi,
      },
      ios: {
        ...expo.ios,
        infoPlist: {
          ...(expo.ios.infoPlist || {}),
          ...(httpApi ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } : {}),
        },
      },
    },
  };
};
