const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const dirVars = require('./dir.js'); // 与业务代码共用同一份路径的配置表
const pluginsConfig = []
const path = require('path')
const precss = require('precss');
const autoprefixer = require('autoprefixer')
const eslintFormatter = require('eslint-friendly-formatter');
const rimraf= require('rimraf');
const fs= require('fs');

// 清空dll文件夹
rimraf(dirVars.dllDir, fs, function cb() {
  console.log('dll目录已清空');
});
pluginsConfig.push(new webpack.optimize.UglifyJsPlugin({
  ie8: true,
  compress: {
    warnings: false,
  },
  mangle: {
    safari10: true,
  },
}));

pluginsConfig.push(new webpack.DefinePlugin({
  IS_PRODUCTION: true,
}));

pluginsConfig.push(new webpack.NoEmitOnErrorsPlugin()); // 配合CLI的--bail，一出error就终止webpack的编译进程

pluginsConfig.push(
  new webpack.LoaderOptionsPlugin({
    options: {
      postcss: function postcss() {
        return [precss, autoprefixer({
          remove: false,
          browsers: ['ie >= 8', '> 1% in CN'],
        })];
      },
      eslint: {
        configFile: path.resolve(dirVars.staticRootDir, './.eslintrc.js'),
        failOnWarning: true,
        failOnError: true,
        cache: true,
      },
    },
  })
);

/* HashedModuleIdsPlugin 这个插件，他是根据模块的相对路径生成一个长度只有四位的字符串作为模块的 module id ，
这样就算引入了新的模块，也不会影响 module id 的值，只要模块的路径不改变的话。 */
pluginsConfig.push(new webpack.HashedModuleIdsPlugin());
module.exports = {
  output: {
    path: dirVars.dllDir,
    filename: '[name].js',
    library: '[name]', // 当前Dll的所有内容都会存放在这个参数指定变量名的一个全局变量下，注意与DllPlugin的name参数保持一致
  },
  entry: {
    /*
      指定需要打包的js模块
      或是css/less/图片/字体文件等资源，但注意要在module参数配置好相应的loader
    */
    dll: [
      'jquery',
      'bootstrap/dist/css/bootstrap.min.css', 'bootstrap/dist/js/bootstrap.min.js',
      'metisMenu/metisMenu.min', 'metisMenu/metisMenu.min.css',
    ],
  },
  plugins: [
    new webpack.DllPlugin({
      path: 'manifest.json', // 本Dll文件中各模块的索引，供DllReferencePlugin读取使用
      name: '[name]',  // 当前Dll的所有内容都会存放在这个参数指定变量名的一个全局变量下，注意与参数output.library保持一致
      context: dirVars.staticRootDir, // 指定一个路径作为上下文环境，需要与DllReferencePlugin的context参数保持一致，建议统一设置为项目根目录
    }),
    /* 跟业务代码一样，该兼容的还是得兼容 */
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      'window.$': 'jquery',
    }),
    new ExtractTextPlugin('[name].css'), // 打包css/less的时候会用到ExtractTextPlugin
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
    }),
    new webpack.LoaderOptionsPlugin({
      options: {
        postcss: function postcss() {
        return [precss, autoprefixer({
          remove: false,
          browsers: ['ie >= 8', '> 1% in CN'],
        })];
        }
      }
    })
  ],
  module:{
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: 'eslint-loader',
        include: dirVars.srcRootDir,
        exclude: /bootstrap/,
        options: {
          formatter: eslintFormatter,
          fix: true,
        },
      },
      {
        test: /\.js$/,
        include: dirVars.srcRootDir,
        loader: 'babel-loader',
        options: {
          presets: [['es2015', { loose: true }]],
          cacheDirectory: true,
          plugins: ['transform-runtime'],
        },
      },
      {
        test: /\.html$/,
        include: dirVars.srcRootDir,
        loader: 'html-loader',
      },
      {
        test: /\.ejs$/,
        include: dirVars.srcRootDir,
        loader: 'ejs-loader',
      },
      {
        // 图片加载器，雷同file-loader，更适合图片，可以将较小的图片转成base64，减少http请求
        // 如下配置，将小于8192byte的图片转成base64码
        test: /\.(png|jpg|gif)$/,
        include: dirVars.srcRootDir,
        // loader: 'url-loader?limit=8192&name=./static/img/[hash].[ext]',
        loader: 'url-loader',
        options: {
          limit: 8192,
          name: './static/img/[hash].[ext]',
        },
      },
      {
        // 专供bootstrap方案使用的，忽略bootstrap自带的字体文件
        test: /\.(woff|woff2|svg|eot|ttf)$/,
        include: /glyphicons/,
        loader: 'null-loader',
      },
      {
        // 专供iconfont方案使用的，后面会带一串时间戳，需要特别匹配到
        test: /\.(woff|woff2|svg|eot|ttf)\??.*$/,
        include: dirVars.srcRootDir,
        // exclude: /glyphicons/,
        // loader: 'file-loader?name=static/fonts/[name].[ext]',
        loader: 'file-loader',
        options: {
          name: 'static/fonts/[name].[hash].[ext]',
        },
      },{
        test: /\.css$/,
        exclude: /node_modules|bootstrap/,
        // loader: ExtractTextPlugin.extract('css?minimize&-autoprefixer!postcss'),
        use: ExtractTextPlugin.extract([
          {
            loader: 'css-loader',
            options: {
              minimize: true,
              '-autoprefixer': true,
            },
          },
          {
            loader: 'postcss-loader',
          },
        ]),
      },{
        test: /\.css$/,
        include: /bootstrap/,
        use: ExtractTextPlugin.extract([
          {
            loader: 'css-loader',
          },
        ]),
      },{
        test: /\.less$/,
        include: dirVars.srcRootDir,
        use: ExtractTextPlugin.extract([
          {
            loader: 'css-loader',
            options: {
              minimize: true,
              '-autoprefixer': true,
            },
          },
          {
            loader: 'postcss-loader',
          },
          {
            loader: 'less-loader',
          },
        ]),
      }
  ]
  }, // 沿用业务代码的module配置
  resolve:{ 
     alias: {
    /* 各种目录 */
    iconfontDir: path.resolve(dirVars.publicDir, 'iconfont/'),
    configDir: dirVars.configDir,
    vendorDir: dirVars.vendorDir,

    /* vendor */
    /* bootstrap 相关 */
    metisMenu: path.resolve(dirVars.vendorDir, 'metisMenu/'),

    /* libs */
    withoutJqueryModule: path.resolve(dirVars.libsDir, 'without-jquery.module'),
    routerModule: path.resolve(dirVars.libsDir, 'router.module'),

    libs: path.resolve(dirVars.libsDir, 'libs.module'),

    /* less */
    lessDir: path.resolve(dirVars.publicDir, 'less'),

    /* components */

    /* layout */
    layout: path.resolve(dirVars.layoutDir, 'layout/html'),
    'layout-without-nav': path.resolve(dirVars.layoutDir, 'layout-without-nav/html'),

    /* logic */
    cm: path.resolve(dirVars.logicDir, 'common.module'),
    cp: path.resolve(dirVars.logicDir, 'common.page'),

    /* config */
    configModule: path.resolve(dirVars.configDir, 'common.config'),
  },

  // 当require的模块找不到时，尝试添加这些后缀后进行寻找
  extensions: ['.js', '.css', '.less'],
  }, // 沿用业务代码的resolve配置
};
