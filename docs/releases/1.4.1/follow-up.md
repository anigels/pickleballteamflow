# 1.4.1 review prompt and roster validation follow-up

Base: upstream master `4559685` after PR #33 was merged. Branch: `fix/ios-review-roster-validation`.

## Changes

- `src/components/Home.vue`: blank/whitespace Save Roster submissions show “Enter a roster name to continue.”, expose an alert message and invalid field, and focus the named input. No save occurs until the name is valid. Session-completion review presentation delegates to the review service; completion/scheduling behavior is unchanged.
- `src/services/rateApp.js`: register the local iOS review bridge and delegate presentation. Existing milestone counts, opt-outs, storage key and user-initiated Settings → Rate App action are unchanged.
- `src/services/reviewPrompt.mjs`: iOS uses the system review request, silently tolerating unavailability. Never falls back to a custom prompt or automatic store navigation. Android/browser retain the existing presentation.
- `ios/App/App/ReviewBridgeViewController.swift`: local Capacitor 8 plugin invokes StoreKit `AppStore.requestReview(in:)` on the main thread for the active window scene. No call when the app is inactive or another native controller is presented. No dependency, entitlement or signing change.
- `ios/App/App/Base.lproj/Main.storyboard`, `ios/App/App.xcodeproj/project.pbxproj`: register the custom bridge controller and include its source in the App target. Existing Capacitor plugin loading remains intact.
- `tests/reviewPrompt.test.mjs`: system request, silent failure/no fallback, and Android/browser behavior.
- `scripts/check-overlay-layout.cjs`: empty and whitespace names, accessible error, no storage writes, cancellation, successful trimmed-name saving and preservation of working roster/open/completed rounds on phone, tablet and 200% text.

## Validation and limits

120 unit tests pass. Production web build passes with the existing bundle-size warning. The browser matrix covers 14 viewports and the additional validation flows on iPhone-sized, iPad portrait and large-text configurations.

No Xcode/iOS SDK is available on this Windows host. The Swift source and target/storyboard registration were reviewed against the installed Capacitor 8 interfaces; native compilation and on-device behavior are **not yet verified**. No native build/upload or publishing workflow was triggered.

Native verification before release:

1. Build this branch in Xcode with the existing development signing setup. Confirm the App target compiles, launches, and loads its existing plugins.
2. In a development installation with an eligible review milestone (fresh test app data is sufficient), finish all rounds. Verify the system review sheet and absence of the custom “Enjoying…” modal. Never clear a real user's saved data to run this test.
3. Verify Settings → Rate App still opens the store review page intentionally. Confirm Android's existing review presentation remains unchanged.
4. Test Load Players, player picker and swap on iPhone 17 Pro: Close below status bar, rotation, keyboard, large text, bottom actions, and round scrolling. Repeat on iPad and Android.
5. Test blank/whitespace roster names with VoiceOver/TalkBack, then enter a valid name and save without losing assignments.

Apple decides whether to show review requests in production. **TestFlight does not display the system review prompt**, so its absence there is expected; TestFlight remains suitable for the modal/roster fix checks. A fulfilled bridge request does not mean the user reviewed the app and never marks them as having rated it.

References: [Capacitor local iOS plugins](https://capacitorjs.com/docs/ios/custom-code), [StoreKit requestReview](https://developer.apple.com/documentation/storekit/appstore/requestreview(in:)-1q8qs), [Apple review guidance](https://developer.apple.com/app-store/review/guidelines/#ratings-and-reviews).

## App Store Connect

The approved description cleanup was saved to Pickleball Team Flow 1.4.1, English (U.S.), still Prepare for Submission. It uses the proposed “Organize pickleball round robins without the paperwork” opening, plain headings and shorter feature sections; literal Markdown markers were removed. Existing approved subtitle, keywords, promotional text, screenshots and release settings were preserved. No submission or publication occurred.

This follow-up supersedes the earlier report's pending recommendation to clean up the description and its statement that rating presentation was unchanged. Native verification remains outstanding.
