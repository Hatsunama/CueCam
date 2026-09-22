export const PRIVACY_POLICY_EFFECTIVE_DATE = 'September 22, 2026';

export const PRIVACY_POLICY_SECTIONS = [
  {
    heading: 'Data collection',
    body: 'CueCam does not collect, transmit, sell, or share personal data. The app has no accounts, analytics, advertising, or backend service.',
  },
  {
    heading: 'Scripts and settings',
    body: 'Your script and teleprompter preferences stay on your device. Android cloud backup is disabled.',
  },
  {
    heading: 'Camera, microphone, and videos',
    body: 'CueCam uses camera and microphone access only when you choose to record. It uses add-only media-library access to save completed clips to your normal gallery. CueCam does not browse or upload existing photos or videos.',
  },
  {
    heading: 'Account and data deletion',
    body: 'CueCam has no account to delete. Uninstalling CueCam removes its local app data, subject to your phone operating system. Videos already saved to your gallery remain there until you delete them in your gallery app.',
  },
  {
    heading: 'Contact',
    body: 'For privacy, security, legal, copyright, or infringement requests, contact xmilo_at_your_side@proton.me.',
  },
] as const;
