'use strict';
const path = require('path');
const baseWebpackConfig = require('./webpack.base.conf');
const dirVars = require('./dir.js');
const configEntry = {};
const HtmlWebpackPlugin = require('html-webpack-plugin');
const rimraf= require('rimraf');
const fs= require('fs');

// 清空dist文件夹
rimraf(dirVars.buildDir, fs, function cb() {
  console.log('build目录已清空');
});
baseWebpackConfig.resolve.forEach((page) => {
  configEntry[page] = path.resolve(dirVars.pagesDir, page + '/page');
  const htmlPlugin = new HtmlWebpackPlugin({
    filename: `${page}/page.html`,
    template: path.resolve(dirVars.pagesDir, `./${page}/html.js`),
    chunks: ['webpack-runtime', page, 'commons/commons'],
    hash: true, // 为静态资源生成hash值
    xhtml: true,
  });
  baseWebpackConfig.configPlugins.push(htmlPlugin);
});
module.exports = {
  // devtool: 'eval-source-map',
  entry: configEntry,
  output: {
    path: dirVars.buildDir,
    publicPath: '/',
    filename: '[name]/entry.[chunkhash].js',    // [name]表示entry每一项中的key，用以批量指定生成后文件的名称
    chunkFilename: '[id].[chunkhash].bundle.js',
  },
  module: baseWebpackConfig.rules,
  resolve: baseWebpackConfig.alias,
  plugins: baseWebpackConfig.configPlugins,
};
