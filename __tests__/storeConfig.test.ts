import appConfig from '../app.json';
import storeConfig from '../store.config.json';

// EAS Metadata (`eas metadata:push`) sends store.config.json's version to App Store Connect, which
// only accepts a build whose version matches it. Raising `version` in app.json for a new build
// means raising it here too.
describe('App Store listing', () => {
  it("is for the same version as the app's builds", () => {
    expect((storeConfig.apple as { version?: string }).version).toBe(appConfig.expo.version);
  });
});
