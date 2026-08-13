const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/components/teleprompter-screen.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]);
