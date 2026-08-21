const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const retiredProjectScreen = path.join(sourceRoot, 'components', 'project-library-screen.tsx');
const homeSource = fs.readFileSync(path.join(sourceRoot, 'app', 'index.tsx'), 'utf8');
const teleprompterSource = fs.readFileSync(
  path.join(sourceRoot, 'components', 'teleprompter-screen.tsx'),
  'utf8',
);
const mediaService = fs.readFileSync(path.join(sourceRoot, 'services', 'video-library.ts'), 'utf8');
const recordingController = fs.readFileSync(
  path.join(sourceRoot, 'hooks', 'use-camera-recording-session.ts'),
  'utf8',
);

assert.equal(fs.existsSync(retiredProjectScreen), false);
assert.match(homeSource, /<TeleprompterScreen\s*\/>/);
assert.doesNotMatch(homeSource, /Project|VideoPicker|Timeline/);
assert.doesNotMatch(teleprompterSource, /expo-media-library|expo-screen-orientation|localStorage/);
assert.doesNotMatch(teleprompterSource, /recordAsync|sessionActiveRef|segmentActiveRef/);
assert.match(mediaService, /MediaLibrary\.Asset\.create\(uri\)/);
assert.doesNotMatch(mediaService, /getAssetsAsync|createAlbumAsync|launchImageLibrary/);
assert.match(recordingController, /camera\.recordAsync/);
assert.match(recordingController, /requestVideoSavePermission/);
assert.match(recordingController, /lockRecordingOrientation/);
assert.doesNotMatch(teleprompterSource, /fetch\(|XMLHttpRequest|WebSocket|axios/);

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
