const RETIRED_STORAGE_KEYS = ['cuecam.videoProjects'] as const;

export function removeRetiredData() {
  for (const key of RETIRED_STORAGE_KEYS) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      continue;
    }
  }
}
