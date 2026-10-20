# Equilytics Android app (Trusted Web Activity)

This is not a rewritten native app -- it's a thin wrapper that opens
`https://www.equilytics.in` as a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/overview)
(TWA), Google's own officially-supported way to publish an existing website
as a real, Play-Store-listed Android app. The only native code is
`LauncherActivity.kt`, which is one line extending Google's
`androidbrowserhelper` library -- everything else (UI, data, pages) is the
same Next.js site this repo already builds and deploys.

## Why this instead of a native rewrite

A ground-up native rewrite of a multi-page financial site (search, stock
pages, Market Mood, IPOs, financials tables, charts) in Kotlin would be a
multi-week project duplicating logic that already exists and is already
deployed. A TWA gets you a real installable app -- full-screen, no visible
URL bar once verified, a home-screen icon, a Play Store listing -- for a
few hours of setup instead.

## How it's built

This machine has no Java/Android SDK/Gradle installed, so the project is
built by **GitHub Actions** (`.github/workflows/android-build.yml`) on
every push to `android-app/**`, using the Android SDK GitHub's `ubuntu-latest`
runners already have preinstalled. You don't need Android Studio to get a
build -- only to make and test source changes comfortably, or to run the
app in an emulator. The workflow produces a signed `.apk` (to sideload
directly on a phone for testing) and a signed `.aab` (the format Play
Store actually wants for the listing) as downloadable build artifacts.

## The signing key -- read this before you do anything else

Every update to an app on Play Store must be signed with the **same**
key forever. Lose it, and you can't update this app again -- only publish
a brand new one.

**First run:** no signing key exists yet, so the workflow generates one and
uploads it as a build artifact named `release-keystore-SAVE-THIS-SAFELY`.
**Download that artifact immediately and put it somewhere safe** (a
password manager's file storage, an encrypted drive -- not just a laptop
Downloads folder). It won't be generated again once repo secrets are set.

**To make all future builds reuse that same key** (required before your
first Play Store upload), add these as GitHub repo secrets
(Settings -> Secrets and variables -> Actions -> New repository secret):

| Secret | Value |
|---|---|
| `EQUILYTICS_KEYSTORE_B64` | `base64 -w0 release.jks` (the downloaded keystore file, base64-encoded) |
| `EQUILYTICS_KEYSTORE_PASSWORD` | the password printed in that first run's log |
| `EQUILYTICS_KEY_ALIAS` | `equilytics` |
| `EQUILYTICS_KEY_PASSWORD` | the same password (this project uses one password for both) |

Once those four secrets exist, the workflow stops generating new keys and
always signs with the one you saved.

## Digital Asset Links -- removing the Chrome URL bar

A TWA only opens full-screen, with no browser chrome, once Android has
verified the app and the website are run by the same people. That
verification is a file at `https://www.equilytics.in/.well-known/assetlinks.json`
listing this app's signing certificate fingerprint.

1. After the first CI run, open its log for the "Print signing cert
   fingerprint" step and copy the `SHA256:` value.
2. Create `frontend/.well-known/assetlinks.json` in the main repo (not
   this one) with:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.equilytics.app",
       "sha256_cert_fingerprints": ["<the SHA256 fingerprint from step 1>"]
     }
   }]
   ```
3. Deploy it (it's a static file served by Flask's existing catch-all
   route -- no code change needed, just `git pull` + restart on the
   server). Verify it's live: `curl https://www.equilytics.in/.well-known/assetlinks.json`.
4. Install the APK on an Android phone and confirm it opens without a URL
   bar. If it still shows one, Android hasn't re-verified yet -- this can
   take a few minutes, or reinstalling the APK forces a re-check.

## Publishing to Play Store

This part needs your own Google identity and can't be done by an agent:

1. Create a [Google Play Console](https://play.google.com/console) developer
   account (one-time $25 fee).
2. Create a new app, upload the `.aab` from the CI build artifacts.
3. Fill in the store listing (screenshots, description, privacy policy URL
   -- `https://www.equilytics.in/privacy-policy` already exists and works).
4. Submit for review.

## Local development (optional)

If you later install Android Studio:

```bash
cd android-app
./gradlew assembleDebug   # unsigned debug APK, installable via adb
```

The debug build has no signing config and installs fine for local testing
without touching the release keystore at all.
