# Building the Rush Zone Control APK & IPA

Rush Zone Control is an Expo (SDK 51) React Native app. The Android (.apk) and
iOS (.ipa) binaries are produced with EAS Build, Expo cloud build service.
This workspace cannot produce binaries itself (no Android SDK / Xcode), but
everything is configured and ready below.

## Prerequisites (one time)

1. Create an Expo account at https://expo.dev/signup and log in from the CLI:

       npx eas login

2. Create the project on EAS and link it (this fills the real projectId into
   app.json instead of the placeholder 00000000-0000-0000-0000-000000000000):

       npx eas init

3. For iOS builds you must also be enrolled in the Apple Developer Program
   (https://developer.apple.com/programs/) and have an App Store Connect API
   key or be able to sign in with your Apple ID during the build.

4. The Supabase backend is already configured in .env
   (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY). For
   production builds make sure those point at the live Supabase project.

## Build the Android APK

The apk profile in eas.json produces a standalone installable APK:

       npx eas build --platform android --profile apk

When the build finishes, EAS prints a download link. You can also list and
download all artifacts with:

       npx eas build:list --platform android --limit 5

## Build the iOS package (IPA)

iOS builds need an Apple account; the preview profile keeps them internal
(Ad Hoc / TestFlight style, no App Store submission):

       npx eas build --platform ios --profile preview

For a store-ready build (App Store Connect upload) use:

       npx eas build --platform ios --profile production

## Install on a phone

Android: download the APK and install it (allow unknown sources once).
iOS: open the build link in the Expo web page and follow the install steps, or
upload the IPA to TestFlight from App Store Connect.

## Rebuild after changes

Just run the same eas build command again - EAS caches dependencies and only
recompiles what changed.
