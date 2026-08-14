const assert = require('node:assert/strict');
const { createRequire } = require('node:module');

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
