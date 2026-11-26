import { RouteRecordRaw } from 'vue-router'

// 放在菜单布局下的路由，所有权限都能看到
export const customMenuRouter: RouteRecordRaw[] = [
    {
        path: '/home',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: {
          title: '首页',
          i18nkey: 'm_firstPage'
        }
      },
]

// 整个页面需自己布局，可配置白名单
export const customPageRouter: RouteRecordRaw[] = []

// 白名单
export const customWhiteList: string[] = []
