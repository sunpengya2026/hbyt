import Vue from 'vue'
import 'normalize.css/normalize.css'
import Element from 'element-ui'
// ⚠️ 不要改回 'element-ui/lib/theme-chalk/index.css'（那是预编译好的默认蓝 #409EFF）。
// 主题色统一由 styles/element-variables.scss 定义，这里引它让 sass 现编一套，
// 改色值只需改那个文件，改完才算真的生效。
import '@/styles/element-variables.scss'
import '@/styles/index.scss'
import App from './App.vue'
import store from './store'
import router from './router'
import { getToken } from '@/utils/auth'
import { Message } from 'element-ui'
import { qiankun } from '@/utils/qiankun'

Vue.use(Element, {
  size: 'medium'
})

Vue.config.productionTip = false

// 路由拦截器
// ⚠️ asyncRoutes 只在 createRouter 之外注入一次：router/index.js 只注册 constantRoutes，
// 动态路由统一由下面的 registerAsyncRoutes() 添加，且只允许添加一次（否则每次导航都会重复注册 → 同名路由冲突）。
// 标记挂在 router 实例上（router.__asyncRoutesAdded），resetRouter() 会一并复位。
function registerAsyncRoutes() {
  if (router.__asyncRoutesAdded) return
  router.addRoutes(store.getters.permissionRoutes)
  router.__asyncRoutesAdded = true
}

// ⚠️ 免登录开关（默认开启）
// 当前系统对外发布，不做登录校验：无 token 时自动注入本地 token 与用户信息，
// 全程不调用后端 /v1/auth/login，避免后端未就绪时页面白屏。
// 将来要接回真实登录，把 .env 里的 VUE_APP_FREE_LOGIN 改成 'false' 即可。
const FREE_LOGIN = process.env.VUE_APP_FREE_LOGIN !== 'false'

router.beforeEach(async(to, from, next) => {
  const hasToken = getToken()

  // ---------------- 免登录模式 ----------------
  if (FREE_LOGIN) {
    // 免登录时 /login 没有意义，直接进首页，避免用户看到登录表单
    if (to.path === '/login') {
      next({ path: '/' })
      return
    }

    if (!store.getters.userInfo) {
      await store.dispatch('user/getUserInfo')
    }
    if (store.getters.permissionRoutes.length === 0) {
      await store.dispatch('permission/generateRoutes', ['admin'])
    }
    // 确保本地 token 存在（供 request.js 拦截器使用）
    if (!hasToken) {
      /* [安全清理] 已删除硬编码登录口令
      await store.dispatch('user/login', { username: 'admin', password: 'admin123' })
      */
    }
    const needAddRoutes = !router.__asyncRoutesAdded
    registerAsyncRoutes()
    // 首次注入动态路由后需要重新导航一次，否则当前这次匹配不到目标路由
    next(needAddRoutes ? { ...to, replace: true } : undefined)
    return
  }

  // ---------------- 真实登录模式 ----------------
  if (hasToken) {
    if (to.path === '/login') {
      next({ path: '/' })
    } else {
      const hasUserInfo = store.getters.userInfo
      if (hasUserInfo) {
        // 确保路由已添加
        if (store.getters.permissionRoutes.length === 0) {
          await store.dispatch('permission/generateRoutes', ['admin'])
        }
        registerAsyncRoutes()
        next()
      } else {
        try {
          await store.dispatch('user/getUserInfo')
          await store.dispatch('permission/generateRoutes', ['admin'])
          registerAsyncRoutes()
          next({ ...to, replace: true })
        } catch (error) {
          // 自动登录
      /* [安全清理] 已删除硬编码登录口令
          await store.dispatch('user/login', { username: 'admin', password: 'admin123' })
      */
          await store.dispatch('user/getUserInfo')
          await store.dispatch('permission/generateRoutes', ['admin'])
          registerAsyncRoutes()
          next({ ...to, replace: true })
        }
      }
    }
  } else {
    if (to.path === '/login') {
      next()
    } else {
      // 自动登录
      /* [安全清理] 已删除硬编码登录口令
      await store.dispatch('user/login', { username: 'admin', password: 'admin123' })
      */
      await store.dispatch('user/getUserInfo')
      await store.dispatch('permission/generateRoutes', ['admin'])
      registerAsyncRoutes()
      next({ ...to, replace: true })
    }
  }
})

router.afterEach(() => {
})

// 初始化微前端
if (process.env.VUE_APP_USE_QIANKUN === 'true') {
  qiankun.start()
}

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})
