const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  runtimeCompiler: true,
  configureWebpack: {
    // turn this on to see where the bulk of the app is
    // plugins: [new BundleAnalyzerPlugin()]
  },
  transpileDependencies: ['vuetify']
}
