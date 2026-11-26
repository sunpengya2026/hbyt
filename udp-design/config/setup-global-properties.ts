/**
 * 全局注册
 * @param app
 */
 import { App } from 'vue'
 import { $api } from 'udp/utils/service/request'
 import type { api } from 'udp/utils/service/types'
 import { LoadingBarApiInjection } from 'naive-ui/lib/loading-bar/src/LoadingBarProvider'
 
 declare module 'vue' {
   interface ComponentCustomProperties {
     $api: api
     $loading: LoadingBarApiInjection | null
   }
 }
 
 Object.defineProperty(window, 'udpEnv', {
   writable: false,
   configurable: false
 })

 Object.defineProperty(window, 'udpGlobalConfig', {
  writable: false,
  configurable: false
})
 
 export function setupGlobalMethods(app: App) {
   // 挂载请求
   app.config.globalProperties.$api = $api
 
   // 挂载loading
   app.config.globalProperties.$loading = null
 }
 