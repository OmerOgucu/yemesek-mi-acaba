const app = require('./app.json');

function productionProfile() {
  const profile = process.env.EAS_BUILD_PROFILE || process.env.APP_ENV || '';
  return profile === 'production';
}

function apiUrl() {
  const url = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (productionProfile()) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Production profili https EXPO_PUBLIC_API_URL ister. localhost ve http reddedilir.');
    }
    if (parsed.protocol !== 'https:' || parsed.hostname === 'localhost' || parsed.username) {
      throw new Error('Production profili https EXPO_PUBLIC_API_URL ister. localhost ve http reddedilir.');
    }
    return url.replace(/\/$/, '');
  }
  return url || 'http://localhost:3001';
}

/** Cleartext is only for a non-production http API. Production profile fails closed above. */
module.exports = () => {
  const url = apiUrl();
  const httpApi = url.startsWith('http://');
  const expo = app.expo;
  return {
    expo: {
      ...expo,
      extra: {
        ...(expo.extra || {}),
        apiUrl: url,
      },
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
