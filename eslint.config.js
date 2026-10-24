const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'android/**', 'ios/**', 'artifacts/**'] },
  { files: ['__tests__/**/*.js'], languageOptions: { globals: { describe: 'readonly', test: 'readonly', expect: 'readonly', jest: 'readonly' } } },
]);
