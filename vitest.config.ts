import { defineConfig } from 'vitest/config'
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import mxResolveHooks from './udp-design/build/udp-resolve-hooks'
export default defineConfig({
  test: {
    globals: true,  //全局注册
    // 包含的测试文件路径，这里匹配src目录下所有以.test.ts或.spec.ts结尾的文件
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // 测试环境，使用jsdom模拟浏览器环境（适合测试涉及DOM操作的Vue组件等）
    environment: 'happy-dom', // or 'jsdom', 'node' 模拟浏览器环境
    // 配置别名，使其和vite中的别名配置保持一致，方便在测试文件中导入模块
    alias: {
        '@': path.resolve(__dirname,'src'),
        udp: path.resolve(__dirname, './udp-design')
    },
    // 配置代码覆盖率相关内容
    coverage: {
        // 包含的文件路径，用于计算覆盖率，这里是src下所有的ts和tsx文件
        include: ['src/**/*.{ts,tsx}'],
        // 排除的文件路径，比如类型定义文件等不需要计算覆盖率的文件
        exclude: ['src/**/*.d.ts', 'src/**/*.types.ts','kid-design/**/*.{ts,tsx}'],
        // 覆盖率报告的格式，这里选择生成text格式和lcov格式（lcov可用于生成html格式的详细报告）
        reporter: ['text', 'lcov', 'json', 'html'],
        enabled: true, // 启用覆盖率测试，默认是false
    },

  },
   // 使用插件，这里使用vite-tsconfig-paths插件来让测试能正确解析tsconfig中配置的路径
  plugins: [
    vue(),
    vueJsx(),
    tsconfigPaths(),
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
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },

})
