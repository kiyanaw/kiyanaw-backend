module.exports = {
  runtimeCompiler: true,
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
        }
      ]
    }
  },
  transpileDependencies: ['vuetify'],
}
