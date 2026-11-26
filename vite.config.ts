import type { UserConfig, ConfigEnv } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import { createProxy } from './udp-design/build/vite-proxy'
import transformEnv from './udp-design/build/transform-env'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import mxResolveHooks from './udp-design/build/udp-resolve-hooks'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import { visualizer } from 'rollup-plugin-visualizer'
import mxFileCopyPlugin from './udp-design/build/udp-file-copy-plugin'
import vueI18n from '@intlify/vite-plugin-vue-i18n'
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const envPrefix = 'UDP_'
  const envDir = 'env'
  const viteEnv = loadEnv(mode, envDir, envPrefix)
  const plugins = [
    vue(),
    svgLoader(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia', 
          'vue-i18n', 
    {
      'naive-ui': [
        'useDialog',
        'useMessage',
        'useNotification',
        'useLoadingBar'
      ]
    }
      ],
    resolvers: [mxResolveHooks()]
}),
Components({
  dts: true,
  globs: ['src/components/*.{vue}', 'udp-design/components/tools/icon.ts'],
  resolvers: [NaiveUiResolver()]
}), 
  vueI18n({
    include: [
      resolve(__dirname, './udp-design/lang/**'),
      resolve(__dirname, './src/lang/**')
    ],
    compositionOnly: false,
    runtimeOnly: false
  }), 
    ViteEjsPlugin({
      UDP_PUBLIC_URL: viteEnv.UDP_PUBLIC_URL
    }),
    transformEnv()
  ]
if (process.env.analyzer) {
  plugins.push(
    visualizer({
      open: true,
      gzipSize: true
    })
  )
}
if (!process.env.preview) {
  plugins.push(
    mxFileCopyPlugin([{ from: `dist${viteEnv.UDP_PUBLIC_URL}/index.html`, to: 'dist/index.html', isDelete: true }])
  )
}
return {
  base: `${viteEnv.UDP_PUBLIC_URL}/`,
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      udp: resolve(__dirname, './udp-design')
    }
  },
  plugins,
  define: {
    'process.env': {}
  },
  build: {
    outDir: `dist${viteEnv.UDP_PUBLIC_URL}`,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
        output: {
          // format: 'es',
          // globals: { vue: 'Vue' },
          manualChunks(id) {
            try {
              if (id.includes('node_modules')) {
                const name = id.split('node_modules').slice(-1)[0]
                if (name.includes('lodash')) {
                  return 'lodash'
                } else if (name.includes('encryptlong') || name.includes('js-sha256')) {
                  return 'encryption'
                } else if (id.includes('@vue')) {
                  return 'vue-vendor'
                }
              } else {

                if (id.includes('global-env')) {
                  return 'global-env'
                } else if (id.includes('global-config')) {
                  return 'global-config'
                }
              }
            }
            catch (e) {
              console.log('----error----', id)
            }


          },
          chunkFileNames(chunkInfo) {
            try {
              if (
                chunkInfo.type === 'chunk' &&
                !chunkInfo.exports.length &&
                chunkInfo.moduleIds.some(v => v.includes('global-env') || v.includes('global-config'))
              ) {
                return 'assets/[name].js'
              }
              return 'assets/[name].[hash].js'
            } catch (e) {
              console.log('----chunkFileNames----', chunkInfo)
            }

          }
        }
    }
  },
  envPrefix,
  envDir,
  // esbuild: {
  // 打包时去除'console', 'debugger'
  // drop: mode === 'development' ? [] : ['console', 'debugger'],
  // 删除注释
  // legalComments: 'none'
  // },
  server: {
    host: true,
    proxy: {
      ...createProxy({
        // '^/uap': '自己启动的后端auth服务',
        // '^/platform': '自己启动的后端平台服务（系统管理）',
        // '^/workflow': '自己启动的工作流后端服务',

      })
    }
  }
}
})
