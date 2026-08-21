const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const packageConfig = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

assert.equal(appConfig.version, packageConfig.version);
assert.equal(appConfig.android.package, 'com.thea.cuecam');
assert.equal(appConfig.ios.bundleIdentifier, 'com.thea.cuecam');
assert.equal(appConfig.android.allowBackup, false);

const forbiddenPermissions = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.SYSTEM_ALERT_WINDOW',
];

for (const permission of forbiddenPermissions) {
  assert.ok(appConfig.android.blockedPermissions.includes(permission));
}

const mediaLibraryPlugin = appConfig.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-media-library',
);
assert.ok(mediaLibraryPlugin);
assert.deepEqual(mediaLibraryPlugin[1].granularPermissions, []);

require('../metro.config');
const metroRequire = createRequire(require.resolve('metro/package.json'));
const imageSize = metroRequire('image-size');

const blockedInputs = [
  Buffer.from([0x69, 0x63, 0x6e, 0x73, 0, 0, 0, 8]),
  Buffer.from([0xff, 0x0a, 0, 0, 0, 0, 0, 0]),
  Buffer.from([0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31, 0, 0, 0, 0]),
];

for (const input of blockedInputs) {
  assert.throws(() => imageSize(input), /disabled file type/);
}
