package com.equilytics.app

/**
 * The entire native "app" -- Google's androidbrowserhelper library's
 * LauncherActivity reads the meta-data in AndroidManifest.xml (launch URL,
 * status bar color, splash screen) and opens the site as a Trusted Web
 * Activity: a Custom Tab with no URL bar once Android has verified this
 * app owns equilytics.in via assetlinks.json. No other native code needed.
 */
class LauncherActivity : com.google.androidbrowserhelper.trusted.LauncherActivity()
