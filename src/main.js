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
import { qiankun } from '@/utils/qiankun'

Vue.use(Element, {
  size: 'medium'
})

Vue.config.productionTip = false

const publicPaths = ['/login', '/401', '/404']

router.beforeEach(async(to, from, next) => {
  if (publicPaths.includes(to.path)) {
    next()
    return
  }

  try {
    const user = await store.dispatch('user/getUserInfo')
    if (!router.__asyncRoutesAdded) {
      const routes = await store.dispatch('permission/generateRoutes', user.roles)
      if (store.getters.userInfo !== user) {
        next({ path: '/login', replace: true })
        return
      }
      router.addRoutes(routes)
      router.__asyncRoutesAdded = true
      next({ ...to, replace: true })
      return
    }
    next()
  } catch (error) {
    next({ path: '/login', replace: true })
  }
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
