# CueCam Expo Camera fork

This directory vendors Expo Camera 57.0.3 from the Expo SDK 57 release under its MIT license.

CueCam retains the Android `VideoCapture` use case, seeds it from the current display rotation, and updates its target rotation from the existing sensor listener. The upstream implementation updates photo and analysis use cases but omits video, which records portrait output after a device rotates while the activity handles configuration changes.

The upstream precompiled publication is intentionally excluded so Android and iOS compile the audited source in this directory.

The regression contract is enforced by `npm run verify:camera-orientation`.
