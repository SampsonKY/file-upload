const path = require('path');
/** 将 CSS 提取到单独的文件中 */
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
/** 压缩 css */
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
/** 生成 HTML 文件 */
const HtmlWebpackPlugin = require('html-webpack-plugin');
/** 可视化 webpack 输出文件大小 */
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
/** 压缩JavaScript */
const TerserJSPlugin = require('terser-webpack-plugin');
/** 编译时 ts 类型检查 */
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: '[name].bundle.js',
    chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
    path: path.resolve(__dirname, '..', 'dist'),
    clean: true, // 清理dist文件夹
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
    },
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        loader: 'babel-loader',
        options: { cacheDirectory: true },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.less$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].css', // 输出css文件名
      chunkFilename: 'static/css/[name].[contenthash:8].chunk.css', // 非入口的chunk文件名
      ignoreOrder: true, // 移除order警告
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      minify: {
        collapseWhitespace: true, // 删除空格、换行
      },
    }),
    new BundleAnalyzerPlugin({
      // bundle 分析
      analyzerMode: 'disabled', // 生成json文件
      generateStatsFile: false,
    }),
    new TerserJSPlugin(),
    new ForkTsCheckerWebpackPlugin(),
  ],
  optimization: {
    minimizer: [new CssMinimizerPlugin()],
  },
};
