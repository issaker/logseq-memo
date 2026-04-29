const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  entry: './src/extension.tsx',
  resolve: {
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  optimization: {
    splitChunks: false,
    minimize: false,
  },
  devtool: false,
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
    ],
  },
  output: {
    filename: 'extension.js',
    path: __dirname,
  },
};
