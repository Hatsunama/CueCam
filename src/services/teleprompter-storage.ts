export const SCRIPT_CHARACTER_LIMIT = 300_000;

export type PromptFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StoredFrames = Partial<Record<'portrait' | 'landscape', PromptFrame>>;

export type TeleprompterSettings = {
  fontSize: number;
  speed: number;
  countdown: number;
  overlayOpacity: number;
  mirrorText: boolean;
};

export const DEFAULT_SCRIPT = `Here is your script.

Take a breath, look into the lens, and speak like you are talking to one person.

CueCam will keep the words moving while the camera records. You can pause the scroll at any time without stopping your video.

Tap Edit to paste in your own script, then choose your text size, speed, countdown, and overlay style.`;

export const DEFAULT_SETTINGS: TeleprompterSettings = {
  fontSize: 38,
  speed: 38,
  countdown: 3,
  overlayOpacity: 0.64,
  mirrorText: false,
};

const STORAGE_KEYS = {
  script: 'cuecam.script',
  settings: 'cuecam.settings',
  frames: 'cuecam.promptFrames',
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function finiteNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, minimum, maximum)
    : fallback;
}

function sanitizeSettings(value: unknown): TeleprompterSettings {
  const candidate = value && typeof value === 'object'
    ? value as Partial<TeleprompterSettings>
    : {};
  return {
    fontSize: finiteNumber(candidate.fontSize, DEFAULT_SETTINGS.fontSize, 24, 68),
    speed: finiteNumber(candidate.speed, DEFAULT_SETTINGS.speed, 10, 92),
    countdown: candidate.countdown === 0 || candidate.countdown === 3 || candidate.countdown === 5
      ? candidate.countdown
      : DEFAULT_SETTINGS.countdown,
    overlayOpacity: finiteNumber(candidate.overlayOpacity, DEFAULT_SETTINGS.overlayOpacity, 0.2, 0.9),
    mirrorText: typeof candidate.mirrorText === 'boolean'
      ? candidate.mirrorText
      : DEFAULT_SETTINGS.mirrorText,
  };
}

function sanitizeFrame(value: unknown): PromptFrame | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<PromptFrame>;
  if (
    !Number.isFinite(candidate.x) ||
    !Number.isFinite(candidate.y) ||
    !Number.isFinite(candidate.width) ||
    !Number.isFinite(candidate.height)
  ) return undefined;
  return candidate as PromptFrame;
}

function sanitizeFrames(value: unknown): StoredFrames {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as StoredFrames;
  const portrait = sanitizeFrame(candidate.portrait);
  const landscape = sanitizeFrame(candidate.landscape);
  return {
    ...(portrait ? { portrait } : {}),
    ...(landscape ? { landscape } : {}),
  };
}

function readValue<T>(key: string, fallback: T, sanitize: (value: unknown) => T): T {
  try {
    const stored = globalThis.localStorage?.getItem(key);
    return stored === null || stored === undefined ? fallback : sanitize(JSON.parse(stored));
  } catch {
    return fallback;
  }
}

function writeValue(key: string, value: unknown) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function loadScript() {
  return readValue(
    STORAGE_KEYS.script,
    DEFAULT_SCRIPT,
    (value) => typeof value === 'string'
      ? value.slice(0, SCRIPT_CHARACTER_LIMIT)
      : DEFAULT_SCRIPT,
  );
}

export function saveScript(script: string) {
  writeValue(STORAGE_KEYS.script, script.slice(0, SCRIPT_CHARACTER_LIMIT));
}

export function loadSettings() {
  return readValue(STORAGE_KEYS.settings, DEFAULT_SETTINGS, sanitizeSettings);
}

export function saveSettings(settings: TeleprompterSettings) {
  writeValue(STORAGE_KEYS.settings, sanitizeSettings(settings));
}

export function loadFrames() {
  return readValue(STORAGE_KEYS.frames, {}, sanitizeFrames);
}

export function saveFrames(frames: StoredFrames) {
  writeValue(STORAGE_KEYS.frames, sanitizeFrames(frames));
}
