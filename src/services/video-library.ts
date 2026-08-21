import * as MediaLibrary from 'expo-media-library';

export type SaveVideoResult = 'saved' | 'permission-denied';

export async function saveVideoToCameraRoll(uri: string): Promise<SaveVideoResult> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return 'permission-denied';
  await MediaLibrary.Asset.create(uri);
  return 'saved';
}
