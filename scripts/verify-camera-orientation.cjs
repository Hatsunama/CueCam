const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(
  projectRoot,
  'vendor',
  'expo-camera',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'camera',
  'ExpoCameraView.kt',
);
const packagePath = path.join(projectRoot, 'vendor', 'expo-camera', 'package.json');
const moduleConfigPath = path.join(projectRoot, 'vendor', 'expo-camera', 'expo-module.config.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const cameraPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const moduleConfig = JSON.parse(fs.readFileSync(moduleConfigPath, 'utf8'));

const requirements = [
  ['pinned Expo Camera baseline', cameraPackage.name === 'expo-camera' && cameraPackage.version === '57.0.3'],
  ['video use-case retention', source.includes('private var videoCaptureUseCase: VideoCapture<Recorder>? = null')],
  ['sensor rotation retention', source.includes('private var deviceRotation = Surface.ROTATION_0')],
  ['video rotation updates', source.includes('videoCaptureUseCase?.targetRotation = rotation')],
  ['initial video target rotation', source.includes('setTargetRotation(deviceRotation)')],
  ['Android source compilation', moduleConfig.android?.publication === undefined],
];

const failures = requirements.filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length > 0) {
  console.error(`Camera orientation verification failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log('Camera orientation verification passed.');
