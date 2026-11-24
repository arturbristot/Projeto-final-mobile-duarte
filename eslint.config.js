// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Testes automatizados (Jest) e testes das regras do Firestore (Node).
    files: ['__tests__/**/*.js', 'regras/**/*.js'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
]);
