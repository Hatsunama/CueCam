const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const easConfig = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
const privacyPolicy = fs.readFileSync(path.join(root, 'src', 'services', 'privacy-policy.ts'), 'utf8');
const privacySurface = fs.readFileSync(path.join(root, 'src', 'components', 'privacy-policy-modal.tsx'), 'utf8');

assert.equal(easConfig.build.production.distribution, 'store');
assert.equal(easConfig.build.production.android.buildType, 'app-bundle');
assert.match(privacyPolicy, /https:\/\/github\.com\/Hatsunama\/CueCam\/blob\/main\/PRIVACY\.md/);
assert.match(privacySurface, /accessibilityRole="link"/);
assert.match(appConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-camera')[1].cameraPermission, /camera/i);
assert.match(appConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-camera')[1].microphonePermission, /audio|microphone/i);
assert.ok(Number.isInteger(appConfig.android.versionCode) && appConfig.android.versionCode > 0);
