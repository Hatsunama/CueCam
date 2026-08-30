const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const retiredProjectScreen = path.join(sourceRoot, 'components', 'project-library-screen.tsx');
const homeSource = fs.readFileSync(path.join(sourceRoot, 'app', 'index.tsx'), 'utf8');
const layoutSource = fs.readFileSync(path.join(sourceRoot, 'app', '_layout.tsx'), 'utf8');
const teleprompterSource = fs.readFileSync(
  path.join(sourceRoot, 'components', 'teleprompter-screen.tsx'),
  'utf8',
);
const privacySurface = fs.readFileSync(
  path.join(sourceRoot, 'components', 'privacy-policy-modal.tsx'),
  'utf8',
);
const mediaService = fs.readFileSync(path.join(sourceRoot, 'services', 'video-library.ts'), 'utf8');
const storageService = fs.readFileSync(
  path.join(sourceRoot, 'services', 'teleprompter-storage.ts'),
  'utf8',
);
const privacyPolicy = fs.readFileSync(
  path.join(sourceRoot, 'services', 'privacy-policy.ts'),
  'utf8',
);
const recordingController = fs.readFileSync(
  path.join(sourceRoot, 'hooks', 'use-camera-recording-session.ts'),
  'utf8',
);

assert.equal(fs.existsSync(retiredProjectScreen), false);
assert.match(homeSource, /<TeleprompterScreen\s*\/>/);
assert.doesNotMatch(homeSource, /Project|VideoPicker|Timeline|CameraView|recordAsync|localStorage/);
assert.match(layoutSource, /GestureHandlerRootView/);
assert.match(layoutSource, /removeRetiredData/);
assert.doesNotMatch(teleprompterSource, /GestureHandlerRootView/);
assert.doesNotMatch(teleprompterSource, /expo-media-library|expo-screen-orientation|localStorage/);
assert.doesNotMatch(teleprompterSource, /recordAsync|sessionActiveRef|segmentActiveRef/);
assert.doesNotMatch(teleprompterSource, /mode=["']video["']/);
assert.doesNotMatch(teleprompterSource, /mirror=\{facing/);
assert.doesNotMatch(teleprompterSource, /cuecam-session|cuecam-recording/);
assert.doesNotMatch(teleprompterSource, /fetch\(|XMLHttpRequest|WebSocket|axios/);
assert.doesNotMatch(teleprompterSource, /minimumValue=\{24\}|maximumValue=\{68\}|\[0, 3, 5\]/);
assert.match(teleprompterSource, /FONT_SIZE_RANGE/);
assert.match(teleprompterSource, /COUNTDOWN_OPTIONS/);
assert.match(teleprompterSource, /PROMPT_SCROLL_KEEP_AWAKE_TAG|cuecam-prompt-scroll/);
assert.match(teleprompterSource, /cameraPreviewProps/);
assert.match(teleprompterSource, /isSessionInProgress/);
assert.match(mediaService, /MediaLibrary\.Asset\.create\(uri\)/);
assert.doesNotMatch(mediaService, /getAssetsAsync|createAlbumAsync|launchImageLibrary/);
assert.match(storageService, /FONT_SIZE_RANGE/);
assert.match(storageService, /COUNTDOWN_OPTIONS/);
assert.match(storageService, /sanitizeSettings/);
assert.match(privacyPolicy, /PRIVACY_POLICY_EFFECTIVE_DATE/);
assert.doesNotMatch(privacySurface, /August 13, 2026/);
assert.match(recordingController, /camera\.recordAsync/);
assert.match(recordingController, /requestVideoSavePermission/);
assert.match(recordingController, /lockRecordingOrientation/);
assert.match(recordingController, /mode:\s*['"]video['"]/);
assert.match(recordingController, /mirror:\s*facing === ['"]front['"]/);
assert.match(recordingController, /RECORDING_KEEP_AWAKE_TAG|cuecam-recording/);
assert.match(recordingController, /abandonSession/);
assert.match(recordingController, /callbacksRef\.current\.canRecord/);
assert.match(recordingController, /callbacksRef\.current\.countdownSeconds/);
assert.match(recordingController, /if \(!segmentActiveRef\.current\) return;/);

const prohibitedProductTerms = /ProjectLibraryScreen|videoProjects|selectedVideos|videoTimeline/;
const files = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(entryPath);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(entryPath);
  }
};
visit(sourceRoot);

for (const file of files) {
  if (file.endsWith(path.join('services', 'app-migrations.ts'))) continue;
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), prohibitedProductTerms, file);
}
