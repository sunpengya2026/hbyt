import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { constantRouter } from 'udp/router/router-config-default'
import { customPageRouter } from '@/router/router-custom'
import createRouterGuard from 'udp/router/permission-usercenter'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { left: 0, top: 0 }
    }
  },
  routes: [...constantRouter, ...customPageRouter]
})

export async function setupRouter(app: App) {
  // 挂载路由
  app.use(router)

  // 路由守卫
  createRouterGuard(router)

  // 路由准备就绪
  await router.isReady()
}
