import * as ScreenOrientation from 'expo-screen-orientation';

export async function lockRecordingOrientation() {
  const orientation = await ScreenOrientation.getOrientationAsync();
  const locks: Partial<Record<ScreenOrientation.Orientation, ScreenOrientation.OrientationLock>> = {
    [ScreenOrientation.Orientation.PORTRAIT_UP]: ScreenOrientation.OrientationLock.PORTRAIT_UP,
    [ScreenOrientation.Orientation.PORTRAIT_DOWN]: ScreenOrientation.OrientationLock.PORTRAIT_DOWN,
    [ScreenOrientation.Orientation.LANDSCAPE_LEFT]: ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
    [ScreenOrientation.Orientation.LANDSCAPE_RIGHT]: ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
  };
  const preferred = locks[orientation] ?? ScreenOrientation.OrientationLock.DEFAULT;
  if (await ScreenOrientation.supportsOrientationLockAsync(preferred)) {
    await ScreenOrientation.lockAsync(preferred);
    return;
  }
  const landscape = orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
    orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
  await ScreenOrientation.lockAsync(
    landscape
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP,
  );
}

export async function unlockRecordingOrientation() {
  await ScreenOrientation.unlockAsync();
}
