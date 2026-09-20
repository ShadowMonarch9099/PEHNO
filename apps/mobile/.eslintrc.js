module.exports = {
  extends: [require.resolve('@pehno/config/eslint.js')],
  ignorePatterns: ['node_modules/', '.expo/', 'babel.config.js', '.eslintrc.js'],
  env: { 'react-native/react-native': true, es2022: true },
  // JSX text is not HTML in React Native; straight apostrophes are fine
  rules: { 'react/no-unescaped-entities': 'off' },
};
