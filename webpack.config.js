const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/app.js',
  devtool: 'source-map',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      {
        test: /\.(scss)$/,
        use: [{
          loader: 'style-loader', // inject CSS to page
        }, {
          loader: 'css-loader', // translates CSS into CommonJS modules
        }, {
          loader: 'postcss-loader', // Run post css actions
          options: { postcssOptions: { plugins: ['precss', 'autoprefixer'] } }
        }, {
          loader: 'sass-loader' // compiles Sass to CSS
        }]
      }
    ]
  },
  stats: { warningsFilter: [/Failed to parse source map/] },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'YanuX YouTube Viewer',
      // Load a custom template (lodash by default see the FAQ for details)
      template: 'src/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: '*.json', context: 'src/' },
        { from: 'images/*', context: 'src/' }
      ]
    })
  ]
};
