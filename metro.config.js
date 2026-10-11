// Sentry's Metro config: Expo's defaults plus a debug ID in every bundle, which is how uploaded
// source maps are matched to crash reports (see scripts/build-web.sh).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
