module.exports = {
  arrowParens: 'always',
  printWidth: 100,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  overrides: [
    {
      files: 'frontend/**/*.html',
      options: {
        parser: 'angular'
      }
    }
  ]
}
