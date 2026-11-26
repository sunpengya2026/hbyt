'use strict';
const path = require('path');
const webpack = require("webpack")
const defaultSettings = require('./src/settings.js');
const {packageName} = require('./package.json').name

function resolve(dir) {
    return path.join(__dirname, dir);
}

const name = defaultSettings.title || 'Report Processing Engine';

const CompressionPlugin = require('compression-webpack-plugin')
const productionGzipExtensions = /\.(js|css|json|txt|ico)(\?.*)?$/i

const port = process.env.port || process.env.npm_config_port || 8082;
const publicPath = '/dh-desdoc-cbm/';

const history = require('connect-history-api-fallback');

module.exports = {
  publicPath: publicPath,
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: false,
  transpileDependencies: ['docx-preview'],
  productionSourceMap: true,
  parallel: false,
  devServer: {
    historyApiFallback: {
      // 处理所有路由，回退到 publicPath 下的 index.html
      rewrites: [
        // 静态资源 / 接口不参与回退（避免 favicon、sockjs 等被错误重写）
        { from: /^\/static\/.*$/, to: function (ctx) { return ctx.parsedUrl.pathname } },
        { from: /^\/sockjs-node\/.*$/, to: function (ctx) { return ctx.parsedUrl.pathname } },
        { from: /^\/api\/.*$/, to: function (ctx) { return ctx.parsedUrl.pathname } },
        { from: /^\/v1\/.*$/, to: function (ctx) { return ctx.parsedUrl.pathname } },
        // ⚠️ 回退目标必须是 `${publicPath}index.html`，不能写 '/index.html'。
        // 写 '/index.html' 会命中磁盘上未编译的 public/index.html 模板（里面还是
        // `<%= BASE_URL %>favicon.ico`，且没有任何 <script>），
        // 表现就是「刷新深链页面全白、#app 为空、控制台一句报错都没有」。
        // 之前一直靠「先进首页再 router.push」规避，冷启动/直接刷新必现。
        { from: /^\/favicon\.ico$/, to: function (ctx) { return publicPath + 'favicon.ico' } },
        { from: /^\/.*$/, to: publicPath + 'index.html' }
      ]
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    port: 8082,
    open: false,
    overlay: {
      warnings: false,
      errors: true,
    },
    // ⚠️ 路由是 hash 模式（与线上 https://.../dh-desdoc-cbm/#/ 一致），
    // 所有页面路径都在 # 之后，服务端永远只收到 /dh-desdoc-cbm/ 这一个路径，
    // 因此只需保证 /api 与 /v1 不被回退拦截即可，不必做 index.html 回退。
    //
    // 代理链路（本地与线上必须语义一致）：
    //   本地  /api/v1/xxx  → pathRewrite → http://localhost:8080/api/report-processing-engine-service/v1/xxx
    //   线上  /api/v1/xxx  → 网关剥掉 /api → 后端 /report-processing-engine-service/v1/xxx
    // 两者最终都命中后端 context-path，做到「本地调通 = 线上调通」。
    proxy: {
      [process.env.VUE_APP_BASE_API || '/api']: {
        target: process.env.VUE_APP_URL || 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/api': process.env.VUE_APP_PROXY_PREFIX || '/api/report-processing-engine-service'
        }
      },
      // 兼容代码里直接写 /v1/... 的裸请求（如部分 SSE 接口）
      '/v1': {
        target: process.env.VUE_APP_URL || 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/v1': (process.env.VUE_APP_PROXY_PREFIX || '/api/report-processing-engine-service') + '/v1'
        }
      },
      // 统一认证（base-auth-service）：本地把统一认证请求转发到生产同源网关
      //
      //   本地  /ideas-auth/base-auth-service/curuser
      //      →  https://www.hbepicp.petrochina/api/base-auth-service/curuser
      //
      // 🔴 前缀绝不能叫 /api-proxy 或任何以 /api 开头的东西！
      //    devServer.proxy 是**前缀匹配**，'/api' 这个键会先吃掉 '/api-proxy/...'，
      //    请求被转到 localhost:8080 再被改写成
      //    /api/report-processing-engine-service-proxy/... → Tomcat 返回 404。
      //    所以这里用完全不相交的 /ideas-auth。
      //
      // 生产环境不用这个代理：.env.production 里 VUE_APP_AUTH_BASE_API 直接写 /api（同源）。
      '/ideas-auth': {
        target: process.env.VUE_APP_AUTH_URL || 'https://www.hbepicp.petrochina',
        changeOrigin: true,
        // ⚠️ 内网证书是自签的，必须关校验，否则代理层直接 TLS 失败
        secure: false,
        pathRewrite: {
          '^/ideas-auth': '/api'
        },
        onProxyRes: function (proxyRes) {
          // 本机调试不涉及浏览器跨域（同源到 dev server），这里补头只为 curl 方便
          proxyRes.headers['access-control-allow-origin'] = '*'
        }
      },
    },
  },
  css: {
    requireModuleExtension: true,
    loaderOptions: {
        sass: {
            prependData: `@import "@/styles/mixin.scss";@import "@/styles/variables.scss";`,
        },
    },
  },
  configureWebpack: {
    name: name,
    resolve: {
        alias: {
            '@': resolve('src'),
            '@public': path.resolve(__dirname, 'public'),
            'docx-preview$': require.resolve('docx-preview'),
            /* [安全清理-中风险] 'jquery': 'jquery', */
        },
    },
    output: {
        library: `${packageName}-[name]`,
        libraryTarget: 'umd',
        jsonpFunction: `webpackJsonp_${packageName}`
    },
    plugins: [
        /* [安全清理-中风险] 已移除 jquery ProvidePlugin
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "windows.jQuery": "jquery"
        })
        */
    ],
  },
  chainWebpack(config) {
    // webpack 4 cannot parse these operators in the DOCX renderer.
    config.module.rule('js').use('babel-loader').tap(options => ({
      ...options,
      overrides: [{
        test: /node_modules[\\/]docx-preview[\\/]/,
        plugins: [
          '@babel/plugin-transform-optional-chaining',
          '@babel/plugin-transform-nullish-coalescing-operator'
        ]
      }]
    }))

    // 注意：配置了 pages 后，vue-cli 不再自动注入 preload 插件，
    // 因此这里必须做存在性判断，否则 .tap() 会抛
    // "Cannot call .tap() on a plugin that has not yet been defined"。
    if (config.plugins.has('preload')) {
      config.plugin('preload').tap(() => [
          {
              rel: 'preload',
              fileBlacklist: [/\.map$/, /hot-update\.js$/, /runtime\..*\.js$/],
              include: 'initial',
          },
      ]);
    }

    if (config.plugins.has('prefetch')) {
      config.plugins.delete('prefetch');
    }

    config.module.rule('svg').exclude.add(resolve('src/icons')).end();
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]',
      })
      .end();
    config.module
      .rule('images')
      .test(/\.(png|jpe?g|gif)(\?.*)?$/)
      .use('url-loader')
      .loader('url-loader')
      .options({
        limit: 4096,
        fallback: {
          loader: 'file-loader',
          options: {
            name: 'img/[name].[hash:8].[ext]',
            publicPath,
          },
        },
      })
      .end();

    config.when(process.env.NODE_ENV !== 'development', (config) => {
      config
        .plugin('ScriptExtHtmlWebpackPlugin')
        .after('html')
        .use('script-ext-html-webpack-plugin', [
          {
            inline: /runtime\..*\.js$/,
          },
        ])
        .end();
      config.optimization.splitChunks({
        chunks: 'all',
        cacheGroups: {
          libs: {
            name: 'chunk-libs',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial',
          },
          elementUI: {
            name: 'chunk-elementUI',
            priority: 20,
            test: /[\\/]node_modules[\\/]_?element-ui(.*)/,
          },
          commons: {
            name: 'chunk-commons',
            test: resolve('src/components'),
            minChunks: 3,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      });
      config.optimization.runtimeChunk('single');
    });
    config.when(process.env.NODE_ENV === 'production', (config) => {
      config.plugin('compressionPlugin').use(
        new CompressionPlugin({
          filename: '[path].gz[query]',
          algorithm: 'gzip',
          test: productionGzipExtensions,
          threshold: 10240,
          minRatio: 0.8
        })
      )
    });
  },
};
