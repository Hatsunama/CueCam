export const PRIVACY_POLICY_URL = 'https://github.com/Hatsunama/CueCam/blob/main/PRIVACY.md';
export const PRIVACY_POLICY_EFFECTIVE_DATE = 'August 13, 2026';

export const PRIVACY_POLICY_SECTIONS = [
  {
    heading: 'Data collection',
    body: 'CueCam does not collect, transmit, sell, or share personal data. The app has no account system, analytics, advertising, or backend service.',
  },
  {
    heading: 'Scripts and settings',
    body: 'Your script and teleprompter preferences stay on your device. Android cloud backup is disabled. Uninstalling CueCam removes its local app data, subject to the phone operating system’s normal behavior.',
  },
  {
    heading: 'Camera, microphone, and videos',
    body: 'CueCam uses camera and microphone access only when you choose to record. It uses add-only media-library access to save completed clips to your normal gallery. CueCam does not browse or upload existing photos or videos.',
  },
] as const;
