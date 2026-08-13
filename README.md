# CueCam

CueCam is a phone-first teleprompter and video recorder built with Expo 57 and React Native.

## Features

- Adjustable text size and automatic scrolling speed
- Portrait and landscape layouts
- Camera recording saved to the phone's normal media library
- Movable and resizable prompt frame with an animated crop-style border
- Live scroll-position marker that follows the prompt from top to bottom
- Scripts up to 300,000 characters
- Countdown, mirroring, camera switching, and persistent script settings

Flipping cameras during a take continues the CueCam session and saves each camera segment as an adjacent clip in the phone gallery.

## Run locally

```bash
npm install
npx expo start
```

For a native Android development build:

```bash
npx expo run:android
```
