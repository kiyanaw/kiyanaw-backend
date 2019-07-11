var webpackConfig = require('./webpack.config.karma.js')


module.exports = function (config) {
  config.set({
    frameworks: ['mocha'],

    files: ['test/karma/**/*.spec.js'],

    preprocessors: {
      'src/**/*.js': ['webpack', 'sourcemap'],
      '**/*.spec.js': ['webpack', 'sourcemap']
    },

    webpack: webpackConfig,

    reporters: ['spec'],

    browsers: ['ChromeHeadless']
  })
}
