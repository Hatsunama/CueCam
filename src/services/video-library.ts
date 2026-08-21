import * as MediaLibrary from 'expo-media-library';

export type SaveVideoResult = 'saved' | 'permission-denied';

export async function requestVideoSavePermission() {
  return (await MediaLibrary.requestPermissionsAsync(true)).granted;
}

export async function saveVideoToCameraRoll(uri: string): Promise<SaveVideoResult> {
  if (!await requestVideoSavePermission()) return 'permission-denied';
  await MediaLibrary.Asset.create(uri);
  return 'saved';
}
