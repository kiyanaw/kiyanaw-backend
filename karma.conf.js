var webpackConfig = require('./webpack.config.karma.js')

module.exports = function (config) {
  config.set({
    frameworks: ['mocha'],
    browserNoActivityTimeout: 400000,
    files: ['test/karma/transcribe/entrypoint.spec.js'],

    preprocessors: {
      'src/**/*.js': ['webpack', 'sourcemap'],
      '**/*.spec.js': ['webpack', 'sourcemap'],
    },

    webpack: webpackConfig,

    reporters: ['spec'],

    browsers: ['ChromeHeadless'],
    client: {
      captureConsole: false,
    },

  })
}
