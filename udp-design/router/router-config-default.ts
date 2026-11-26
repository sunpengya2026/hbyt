import { RouteRecordRaw } from 'vue-router'
import { isLocalLoginPage } from 'udp/config/computed-constant'

const layoutToolsModule = import.meta.glob('../../src/components/layout-tools/**.vue')
const menuLayoutDefined = '../../src/components/layout-tools/menu-layout.vue'

export const asyncRouter: RouteRecordRaw = {
  path: '/',
  name: 'Root',
  component: layoutToolsModule[menuLayoutDefined] || (() => import('udp/layout/menu-layout.vue')),
  meta: {
    title: ''
  },
  children: []
}

export const constantRouter: RouteRecordRaw[] = [
  {
    path: '/404',
    name: '404',
    component: () => import('udp/views/exception/404.vue'),
    meta: {
      title: '页面不存在',
      i18nkey: 'm_noPage',
      hidden: true
    }
  },
  {
    path: '/403',
    name: '403',
    component: () => import('udp/views/exception/403.vue'),
    meta: {
      title: '禁止访问',
      i18nkey: 'm_forbidden',
      hidden: true
    }
  }
]

if (isLocalLoginPage) {
  constantRouter.unshift({
    path: '/login',
    name: 'Login',
    component: () => import('@/components/login/login.vue'),
    meta: {
      title: '登录',
      i18nkey: 'm_login',
      hidden: true
    }
  })
}

// 错误页面
export const errorPageRoute: RouteRecordRaw = {
  path: '/:path(.*)*',
  name: 'ErrorPage',
  meta: {
    title: 'ErrorPage',
    hidden: true
  }
}

// PageBuilding
export const PageBuilding: RouteRecordRaw = {
  path: '/page-building',
  name: 'PageBuilding',
  component: () => import('udp/views/exception/page-building.vue'),
  meta: {
    title: '页面建设开发中',
    i18nkey: 'm_pageBuilding',
    hidden: true
  }
}

// 刷新页面
export const RedirectRoute: RouteRecordRaw = {
  path: '/redirect/:path(.*)',
  name: 'Redirect',
  component: () => import('udp/layout/redirect-layout.vue'),
  meta: {
    title: '页面刷新',
    i18nkey: 'm_pageRefresh',
    hidden: true
  }
}

export const whiteListDefault: string[] = ['Login', '404', 'PageBuilding', '403']
