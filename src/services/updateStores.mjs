import { compareVersions } from './updatePolicy.mjs';

function payload(response) {
  if (response.status !== 200) throw new Error('Store unavailable');
  return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
}
const timeouts = { connectTimeout: 5000, readTimeout: 5000, responseType: 'json' };

export async function lookupIosUpdate(installed, config, http) {
  if (!/^\d+$/.test(config.iosAppStoreId) || installed.id !== config.applicationId) return null;
  const data = payload(await http.get({ url: 'https://itunes.apple.com/lookup',
    params: { id: config.iosAppStoreId, country: config.iosStoreCountry }, ...timeouts }));
  const app = Array.isArray(data?.results) && data.results.find(result =>
    String(result.trackId) === config.iosAppStoreId && result.bundleId === installed.id);
  return app && typeof app.version === 'string' ? { version: app.version, platform: 'ios' } : null;
}

export async function lookupAndroidUpdate(installed, config, http, plugin, onDownloaded = () => {}) {
  if (installed.id !== config.applicationId) return null;
  const data = payload(await http.get({ url: config.androidProductionUrl,
    headers: { 'Cache-Control': 'no-cache' }, ...timeouts }));
  const release = data?.release;
  if (data?.schemaVersion !== 1 || data.applicationId !== installed.id ||
      release?.track !== 'production' || !/^[1-9]\d*$/.test(String(release.versionCode)) ||
      compareVersions(installed.version, release.version) !== -1) return null;
  const info = await plugin.getAppUpdateInfo();
  // Play offers updates for testing tracks too. Exact production-code matching is essential.
  if (info.updateAvailability !== 2 || String(info.availableVersionCode) !== String(release.versionCode) ||
      String(info.currentVersionCode) !== String(installed.build)) return null;
  if (info.installStatus === 11) { onDownloaded(); return null; }
  return { platform: 'android', version: release.version, versionCode: String(release.versionCode) };
}

export async function openOptionalUpdate(candidate, config, plugin) {
  const openStore = () => plugin.openAppStore({ appId: config.iosAppStoreId,
    androidPackageName: config.applicationId });
  if (candidate.platform === 'ios') return openStore();
  let info;
  try { info = await plugin.getAppUpdateInfo(); } catch { return openStore(); }
  // Revalidate after the user acts; a newer testing-track offer must not be started.
  if (info.updateAvailability !== 2 || String(info.availableVersionCode) !== candidate.versionCode) return;
  if (!info.flexibleUpdateAllowed) return openStore();
  try {
    const result = await plugin.startFlexibleUpdate();
    if (result.code === 0 || result.code === 1) return; // Success or user cancellation.
  } catch { /* The store product page is the supported fallback. */ }
  return openStore();
}
