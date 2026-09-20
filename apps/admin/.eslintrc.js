module.exports = {
  extends: [require.resolve('@pehno/config/eslint.js')],
  ignorePatterns: ['node_modules/', '.next/', 'next.config.js', '.eslintrc.js', 'tailwind.config.js', 'postcss.config.js'],
  env: { browser: true, node: true, es2022: true },
  rules: { 'react/no-unescaped-entities': 'off' },
};
