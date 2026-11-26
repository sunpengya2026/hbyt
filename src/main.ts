import { createApp } from 'vue'
import '@/config/global-env.js'
import '@/config/global-config.js'
import { setupRouter } from 'udp/router/index'
import { setupStore } from 'udp/store/index'
import { setupLang } from 'udp/lang/index'
import 'udp/assets/global.less'
import 'udp/assets/standard.less'
import { setupGlobalMethods } from 'udp/config/setup-global-properties'
import { setupDirectives } from 'udp/directives/index'

import App from './App.vue'

async function bootstrap() {
  const app = createApp(App)

  // 挂载pinia状态管理
  setupStore(app)

  // 挂载路由
  await setupRouter(app)

  // 挂载全局属性
  setupGlobalMethods(app)

  // 挂载多语言
  setupLang(app)

  // 按钮权限控制指令
  setupDirectives(app)

  // 挂载实例
  app.mount('#app', true)
}
bootstrap()
