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
    },
    resolve: {
      fallback: {
        "assert": require.resolve("assert/"),
        "path": require.resolve("path-browserify"),
        "fs": false,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer/"),
        "util": require.resolve("util/")
      }
    }
  },
  transpileDependencies: ['vuetify'],
}
