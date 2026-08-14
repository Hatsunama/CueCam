# CueCam

CueCam is a phone-first teleprompter and video recorder built with Expo 57 and React Native.

## Features

- Adjustable text size and automatic scrolling speed
- Start recording from any manually selected place in the script
- Drag the script up or down during recording, then automatically resume scrolling
- Portrait and landscape layouts
- Camera recording saved to the phone's normal media library
- Movable and resizable prompt frame with an animated crop-style border
- Live scroll-position marker that follows the prompt from top to bottom
- Scripts up to 300,000 characters
- Countdown, mirroring, camera switching, and persistent script settings

Flipping cameras during a take continues the CueCam session and saves each camera segment as an adjacent clip in the phone gallery.

## Privacy

CueCam has no accounts, analytics, advertising, or backend service. Scripts and prompt preferences stay in local app storage. Camera and microphone access are used only while recording. Gallery access is requested only when a finished clip needs to be added to the phone's media library. Android cloud backup is disabled so scripts are not copied into device backups.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Run locally

```bash
npm install
npx expo start
```

For a native Android development build:

```bash
npx expo run:android
```

Before a release, run:

```bash
npm run check
```

To build a clean arm64 release from committed source and install it on one connected Android phone:

```powershell
npm run install:android:release
```
