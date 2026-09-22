const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const easConfig = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
const privacyPolicy = fs.readFileSync(path.join(root, 'src', 'services', 'privacy-policy.ts'), 'utf8');
const privacySurface = fs.readFileSync(path.join(root, 'src', 'components', 'privacy-policy-modal.tsx'), 'utf8');
const teleprompterSource = fs.readFileSync(path.join(root, 'src', 'components', 'teleprompter-screen.tsx'), 'utf8');
const privacyMarkdown = fs.readFileSync(path.join(root, 'PRIVACY.md'), 'utf8');

assert.equal(easConfig.build.production.distribution, 'store');
assert.equal(easConfig.build.production.android.buildType, 'app-bundle');
assert.match(privacyPolicy, /PRIVACY_POLICY_EFFECTIVE_DATE/);
assert.match(privacyPolicy, /xmilo_at_your_side@proton\.me/);
assert.match(privacyPolicy, /Account and data deletion/);
assert.match(privacyMarkdown, /xmilo_at_your_side@proton\.me/);
assert.match(privacyMarkdown, /Account and data deletion/);
assert.match(privacySurface, /PRIVACY_POLICY_EFFECTIVE_DATE/);
assert.match(privacySurface, /selectable/);
assert.doesNotMatch(privacySurface, /Linking|PRIVACY_POLICY_URL|accessibilityRole="link"/);
assert.doesNotMatch(teleprompterSource, /accessibilityRole="link"/);
assert.match(appConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-camera')[1].cameraPermission, /camera/i);
assert.match(appConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-camera')[1].microphonePermission, /audio|microphone/i);
assert.ok(Number.isInteger(appConfig.android.versionCode) && appConfig.android.versionCode > 0);
