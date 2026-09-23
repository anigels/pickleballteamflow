# Optional native update checks

## Behavior and identity

App.vue starts the service after mounting. Browsers/PWAs exit before native metadata, storage, lifecycle listeners or store requests. Native startup is deferred 1.5 seconds; foreground resumes use the same controller. Rendering never waits for a check. An existing Ionic overlay or background state defers the prompt until a subsequent eligible foreground check.

Installed version and package/bundle ID come from Capacitor App.getInfo(), not package.json. Numeric release components are compared, so 1.9.0 < 1.10.0; two-component native versions are supported. Unknown and prerelease strings are conservatively ignored.

The bundle/application ID, com.pickleballteamflow.app, was verified in capacitor.config.json and both native projects. The owner supplied Apple ID 6804800516; Apple's US public lookup confirms that ID, bundle ID and Pickleball Team Flow name. iOS queries https://itunes.apple.com/lookup by numeric ID and validates the returned bundle ID. It uses the public App Store version, never TestFlight. Update opens https://apps.apple.com/app/id6804800516. The configured lookup storefront is US; adjust iosStoreCountry if the production app is published in another storefront. Unavailable storefront results silently suppress prompts.

Android uses Google's Play Core update API through @capawesome/capacitor-app-update. This API can offer testing-track releases and does not expose their track or semantic version. Therefore, its offered versionCode must exactly match the owner-maintained PUBLIC PRODUCTION metadata described below, and that metadata's version must exceed the installed native version. No Play HTML is scraped. A testing-track code mismatch suppresses the prompt.

After Update is tapped, Android revalidates the offered code, starts an optional flexible Play update when supported, and falls back to the package's Play Store page if unsupported or failed. Canceling Google's flow does not open the fallback. Downloads do not interrupt play. Once downloaded, a separate Not Now / Restart alert requests consent before completing installation. No immediate/forced update is used. If the process is restarted with a downloaded update pending, the next daily successful production-matched lookup can offer Restart again.

## Publish the approved static JSON

The application requests:

https://marco-rodriguez59.github.io/pickleballteamflow/android-production-release.json

The repository root file is also copied into www by the existing asset-copy script. Publish it to that URL through the site's existing GitHub Pages deployment. No backend, credentials, new workflow or private Play API is required. A fork branch alone does NOT publish this upstream Pages URL. Verify the URL responds with HTTP 200 and JSON before shipping the native app.

The initial file has release: null. This intentionally disables Android prompts until the actual public production versionName and versionCode are verified in Google Play Console. Do not infer these from package.json or a testing build. After a production release is publicly available, replace null with an object containing:

- track: the literal string "production"
- version: the exact production versionName, as a string
- versionCode: the exact positive production versionCode (string or integer)

For example, ONLY if production really has versionName 1.3.0 and versionCode 13:

```json
{
  "schemaVersion": 1,
  "applicationId": "com.pickleballteamflow.app",
  "release": { "track": "production", "version": "1.3.0", "versionCode": 13 }
}
```

Never publish fictional test versions or internal-track codes here. Update the metadata after each public production release, not when uploading a draft/testing build. During staged rollout Play must also offer that exact code to the device. A missing, stale, malformed or unavailable file fails closed without an alert. Set release back to null to suppress future Android offers. This feature trusts the release owner to certify production status accurately.

## Throttle and failure handling

Only new namespaced localStorage keys are used: ptf.optionalUpdate.v1.ios or .android and an Android .readyAt key. Existing game/settings/roster keys are untouched. The controller records lastAttemptAt before checking (including failed checks), lastSuccessfulCheckAt after a completed lookup, and dismissedVersion/dismissedAt after either alert choice or dismissal. Normal launch/resume network checks happen at most once per 24 hours. Explicit Update taps may revalidate Play info to safely carry out the user action. No background polling is added.

Dismissal suppresses the same version for 24 hours. Another version is eligible at the next due check, not immediately after publication: the daily network throttle still applies. Restart suggestions also have a daily throttle. If storage is unavailable, in-memory throttling still applies for the session; persistence across process restarts cannot be guaranteed. Network/plugin/UI failures are caught silently. Native HTTP has five-second connect/read timeouts. Offline game use remains available.

## Dependencies and native setup

- @capacitor/app 8.1.1: native version/build metadata and foreground lifecycle events.
- @capawesome/capacitor-app-update 8.0.5: Capacitor 8 compatible bridge to Google's supported update API, flexible updates and native store opening. No existing dependency versions were updated.

Run npm ci, npm test, npm run build, then npx cap sync on the native build machine. Android Gradle plugin references and iOS Swift Package Manager references are included. The App plugin's default Android back handler is disabled in capacitor.config.json to avoid introducing navigation behavior. Native signing, version numbers and release workflows are unchanged.

On macOS, run npx cap sync ios, open the existing Xcode project and resolve Swift packages. Run on a physical iPhone/iPad; no new App Store Connect entitlement or capability is required. The checked-in Package.swift uses portable forward slashes; syncing on Windows may regenerate backslashes, so perform iOS sync on macOS before building.

In Android Studio, sync Gradle and test on a Play-enabled physical device. Google Play update flows require a Play-owned installation with the same application ID/signing identity and an eligible higher code. Publish the verified production JSON only after the production rollout is public. No new signing configuration or Play Console API credentials are needed.

## Testing before a newer public version exists

npm test uses injected fake metadata, stores, clock, storage and prompts. It covers all requested semantic comparisons, browser exclusion, silent failures, daily persistence, dismissals, concurrency, identity validation, production/testing-code gating and optional Play fallback/cancellation. These tests require neither store publication nor changes to public metadata.

For a native-only visual preview, temporarily replace the mounted service call in a LOCAL DEBUG copy with this explicit test harness (import the two functions from their service modules). Do not commit that replacement or ship it:

```js
if (Capacitor.isNativePlatform()) {
  const preview = createUpdateController({
    isNative: () => true,
    getInstalled: async () => ({ version: '1.2.0' }),
    lookup: async () => ({ platform: 'ios', version: '1.3.0' }),
    prompt: promptForUpdate,
    update: async () => console.info('Update selected; preview only'),
    readState: () => ({}), writeState: () => {}
  });
  setTimeout(() => preview.check(), 1500);
}
```

This displays the real Ionic alert on a native debug device without a store request or install. Restore App.vue afterward. There is no production force flag or browser preview route. Test Not Now, Update, screen-reader title/message/button announcements, focus return, large Dynamic Type/font scaling, landscape, small phone and tablet layouts, and that a running game remains usable afterward.

For actual Play update integration testing, use Google's documented internal app sharing/test workflow with a separate LOCAL debug configuration/fixture for the production manifest adapter. The production code deliberately refuses an internal-only code, so first verify this suppression. Never change the live production JSON to make a test release appear public. Test the flexible download, foreground/background transition, cancel, Restart/Not Now, and store fallback on physical devices. iOS store opening can be tested against the real product URL; fake a newer lookup only in the isolated native debug harness.

Manual regression: airplane-mode launch/resume; repeated foregrounding and relaunch inside 24h; same versus new version after advancing a test clock; malformed/404 metadata; no prompt in browser/PWA; no overlay collision; normal roster, OCR, generation, substitutions, swaps and completed-round behavior. Never clear all localStorage to test this feature; remove only its own namespaced keys in a debug install.

## Verification and file inventory

Production Vite build and native plugin sync pass. Automated tests pass. Actual Xcode/Android native compilation and physical-device store/accessibility testing must still be performed; plugin sync is not a native build. The existing Vite large-chunk warning remains unrelated to this feature.

Changed existing files:

- src/App.vue: initialize/clean up the update service only.
- package.json: two pinned dependencies and Node test script.
- package-lock.json: dependency lock entries only; pre-existing root version values preserved.
- capacitor.config.json: disable the newly added App plugin's default back handler.
- android/app/capacitor.build.gradle and android/capacitor.settings.gradle: generated plugin wiring.
- ios/App/CapApp-SPM/Package.swift: Swift plugin dependencies.
- scripts/copy-assets.mjs: include approved static release metadata.

Added files:

- src/services/updateConfig.js: verified IDs and public endpoint.
- src/services/updatePolicy.mjs: version comparison and dismissal policy.
- src/services/updateController.mjs: injected, testable daily check orchestration.
- src/services/updateStores.mjs: Apple lookup, Android production/Play gating and optional update action.
- src/services/updateService.js: lifecycle, Ionic alerts and flexible update completion consent.
- src/services/updateService.css: scoped wrapping, scrolling and touch target styling.
- android-production-release.json: initially inactive production metadata.
- tests/updateService.test.mjs and tests/updateStores.test.mjs: policy, lifecycle and adapter tests.
- docs/optional-updates.md: this operating and testing guide.

Home.vue and all scheduling, fairness, roster, OCR, substitution, swap, existing persistence and navigation code are unchanged.

References: https://capawesome.io/docs/sdks/capacitor/app-update/ ; https://capacitorjs.com/docs/apis/app ; https://developer.android.com/guide/playcore/in-app-updates/test ; https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/LookupExamples.html
