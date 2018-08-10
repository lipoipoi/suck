const glob = require('glob');
const dirVars = require('./dir.js');
const options = {
  cwd: dirVars.pagesDir, // 在pages目录里找
  sync: true, // 这里不能异步，只能同步
};
const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HashOutput = require('webpack-plugin-hash-output');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path')
const eslintFormatter = require('eslint-friendly-formatter');



const globInstance = new glob.Glob('!(_)*/!(_)*', options); // 考虑到多个页面共用HTML等资源的情况，跳过以'_'开头的目录
module.exports.resolve = globInstance.found; // 一个数组，形如['index/index', 'index/login', 'alert/index']
module.exports.configPlugins = [

  /* 全局shimming */
  new webpack.ProvidePlugin({
    $: 'jquery',
    jQuery: 'jquery',
    'window.jQuery': 'jquery',
    'window.$': 'jquery',
    Vue: 'vue',
    vue: 'vue',
  }),
  /* 抽取出所有通用的部分 */
  new webpack.optimize.CommonsChunkPlugin({
    name: 'commons/commons',      // 需要注意的是，chunk的name不能相同！！！
    filename: '[name]/bundle.[chunkhash].js',
    minChunks: 4,
  }),
  /* 抽取出webpack的runtime代码()，避免稍微修改一下入口文件就会改动commonChunk，导致原本有效的浏览器缓存失效 */
  new webpack.optimize.CommonsChunkPlugin({
    name: 'webpack-runtime',
    filename: 'commons/commons/webpack-runtime.[hash].js',
  }),
  /* 抽取出chunk的css */
  new ExtractTextPlugin('[name]/styles.[contenthash].css'),
  /* 配置好Dll */
  // new webpack.DllReferencePlugin({
  //   context: dirVars.staticRootDir, // 指定一个路径作为上下文环境，需要与DllPlugin的context参数保持一致，建议统一设置为项目根目录
  //   manifest: require('../../manifest.json'), // 指定manifest.json
  //   name: 'dll',  // 当前Dll的所有内容都会存放在这个参数指定变量名的一个全局变量下，注意与DllPlugin的name参数保持一致
  // }),
  new HashOutput({
    manifestFiles: 'webpack-runtime', // 指定包含 manifest 在内的 chunk
  }),
  new webpack.DefinePlugin({
    IS_PRODUCTION: false,
  }),
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
];
module.exports.rules = {
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
      test: /\.less$/,
      include: dirVars.srcRootDir,
      // loader: 'style!css?minimize&-autoprefixer!postcss!less',
      use: [
        {
          loader: 'style-loader',
        },
        {
          loader: 'css-loader',
          // options: {
          //   minimize: true,
          //   '-autoprefixer': true,
          // },
        },
        // {
        //   loader: 'postcss-loader',
        // },
        {
          loader: 'less-loader',
        },
      ],
    },{
      test: /\.css$/,
      include: /bootstrap/,
      // loader: 'style!css',
      use: [
        'style-loader', 'css-loader',
      ],
    },{
      test: /\.css$/,
      exclude: /node_modules|bootstrap/,
      // loader: 'style!css?minimize&-autoprefixer!postcss',
      use: [
        {
          loader: 'style-loader',
        },
        {
          loader: 'css-loader',
          // options: {
          //   minimize: true,
          //   '-autoprefixer': true,
          // },
        },
        // {
        //   loader: 'postcss-loader',
        // },
      ],
    }
  ]
}
module.exports.alias = {
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
}