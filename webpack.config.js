const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const baseConfig = {
  entry: './src/extension.tsx',
  resolve: {
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    '@blueprintjs/core': ['Blueprint', 'Core'],
    '@blueprintjs/select': ['Blueprint', 'Select'],
  },
  optimization: {
    splitChunks: false,
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
    ],
  },
};

module.exports = {
  ...baseConfig,
  output: {
    filename: 'extension.js',
    path: __dirname,
  },
};
