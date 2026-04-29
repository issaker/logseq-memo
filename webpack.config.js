const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const baseConfig = {
  resolve: {
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
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
};

module.exports = [
  // Entry 1: Tiny loader — handles Logseq handshake fast
  {
    ...baseConfig,
    name: 'loader',
    entry: './src/loader.ts',
    output: {
      filename: 'extension.js',
      path: __dirname,
      iife: true,
    },
    optimization: { splitChunks: false },
  },
  // Entry 2: Full App — loaded asynchronously by loader
  {
    ...baseConfig,
    name: 'app',
    entry: './src/app.tsx',
    output: {
      filename: 'app-chunk.js',
      path: __dirname,
      library: { name: '__logseqMemoApp', type: 'assign' },
    },
    optimization: { splitChunks: false },
  },
];
