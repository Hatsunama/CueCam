const { createRequire } = require('node:module');
const { getDefaultConfig } = require('expo/metro-config');

const metroRequire = createRequire(require.resolve('metro/package.json'));
const { disableTypes } = metroRequire('image-size');

disableTypes(['heif', 'icns', 'jxl', 'jxl-stream']);

module.exports = getDefaultConfig(__dirname);
