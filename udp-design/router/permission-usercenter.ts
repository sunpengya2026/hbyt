import type { RouteLocationNormalized } from 'vue-router'
import { Router, START_LOCATION } from 'vue-router'
import qs from 'qs'
import queryEnvConfigMap from 'udp/api/env-change-url-config'
import * as appTheme from '@/config/theme-overrides'
import { customWhiteList } from '@/router/router-custom'
import { whiteListDefault, constantRouter } from 'udp/router/router-config-default'
import { udpUserStore } from 'udp/store/user-store'
import { udpAppStore, Layout } from 'udp/store/app-store'
import { udpPermissionStore } from 'udp/store/permission-store'
import { mxMenuHiddenStore } from 'udp/store/menu-hidden-store'
import { createStorage } from 'udp/utils/Storage'
import { udpLangStore } from 'udp/lang/langStore'
import { i18n } from 'udp/lang'

const { t } = i18n.global
const defaultLayout = appTheme.pageLayout
// 清除token信息的url
const deleteTokenUrl = (to: RouteLocationNormalized) => {
  const query = { ...to.query }
  query.token && delete query.token
  query.jwt && delete query.jwt
  const queryStr = qs.stringify(query)
  return `${to.path.slice(1)}${queryStr ? '?' + queryStr : ''}${to.hash}`
}
// 显示错误弹框
const showNotification = (msg: string) => {
  const notification = window['$notification']
  if (notification) {
    notification.error({
      content: 'Error',
      meta: msg,
      duration: 2000
    })
  }
}
const Storage = createStorage({ prefixKey: '' })
const whiteList = [...customWhiteList, ...whiteListDefault]

export default function createRouterGuard(router: Router) {
  const UserStore = udpUserStore()
  const AppStore = udpAppStore()
  const PermissionStore = udpPermissionStore()
  const MenuHiddenStore = mxMenuHiddenStore()
  const LangStore = udpLangStore()

  const routerLinkTo = (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    const redirect = UserStore.getCurrentRedirectUrl(from, to.fullPath)
    if (redirect.startsWith('http')) {
      window.location.href = redirect
    } else {
      if (decodeURIComponent(to.fullPath) === redirect) {
        return router.push({ ...to })
      } else {
        return router.push(redirect)
      }
    }
  }

  // 白名单跳转
  const whiteListLink = async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    let udpcode = to.query.udpcode
    if (!udpcode && UserStore.userMsg && UserStore.userMsg.init) {
      UserStore.setCurrentuserToPinia()
      let noQueryMenu = false
      if (!UserStore.userMsg || (UserStore.userMsg.displayName === 'public' && !appTheme.isPublicLoginDefault)) {
        noQueryMenu = true
        await UserStore.logout()
      }
      PermissionStore.GenerateRoutesAddRoute(noQueryMenu)
        .then(() => {
          if (UserStore.userMsg.displayName === 'public' && appTheme.isPublicUserToLoginPage) {
            UserStore.noAuthLinkTo()
          } else {
            routerLinkTo(to, from)
          }
        })
        .catch(err => {
          console.error(err)
          showNotification(t('f_msg_menuGetFaild'))
        })
    } else {
      return true
    }
  }
  
  AppStore.setLayout()
  router.beforeEach(async (to, from) => {
    if (!to.name) {
      AppStore.setLoading(true)
    }
    if (!AppStore.isLoadingAnimate) {
      const Loading: Record<string, any> = window['$loading'] || null
      Loading && Loading.start()
    }

    // 更改主题色
    const theme: unknown = to.query.theme
    if (theme) {
      AppStore.setThemeToStore(`#${theme}`)
    }

    // 设置layout布局
    const layout: Layout = to.query.layout as Layout
    if (layout) {
      AppStore.setLayout(layout)
    } else {
      const layout = AppStore.layout
      if (defaultLayout !== layout && (layout === 'singlePage' || layout === 'topPage')) {
        to.query['layout'] = layout
        router.push({ ...to })
      }
    }
    // 多租户
    const tenantCode = to.query?.tenantCode?.toString()
    if (tenantCode) {
      const envMap = (await queryEnvConfigMap) as any
      delete to.query.tenantCode
      envMap?.UDP_TENANT_SINGLE !== 'true' && UserStore.setTenantCode(tenantCode)
    }
    
    // 多语言
    if (from === START_LOCATION) {
      const lang = to.query.lang as string | undefined
      LangStore.setLanguageMessage(lang)
      lang && delete to.query.lang
    }

    // 白名单
    const isWhiteName = to.name && whiteList.includes(to.name.toString())

    // 其他系统跳转进来的
    let udpcode = to.query.udpcode
    if (udpcode) {
      UserStore.setUserMessageToStorage({
        dataRegion: '',
        displayName: '',
        loginName: '',
        organization: '',
        userId: ''
      })
      noPrefixStorage.remove('jwt')
      noPrefixStorage.remove('refresh_token')
      noPrefixStorage.remove('current_user')
      noPrefixStorage.remove('permissionList')
    }

    // 路由传递token
    const token = to.query.jwt || to.query.token
    if (token) {
      // 设置用户信息
      UserStore.setCurrentuser(token as string)
        .then(() => {
          // 设置是否为iam登录
          if (to.query.iamLogin) {
            UserStore.setIamLogin(to.query.iamLogin === '1')
          }
          // 设置token
          UserStore.setToken(token as string)
          delete to.query.token
          delete to.query.jwt
          delete to.query.iamLogin
          // 设置菜单
          return router.replace({ ...to, force: true })
        })
        .catch(err => {
          showNotification(err.msg)
          if (isWhiteName) {
            return router.push({ ...to })
          }
          const href = deleteTokenUrl(to)
          if (Storage.get('jwt')) {
            return router.push(href)
          } else {
            UserStore.logoutToPage()
          }
        })
    } else {
      const token = Storage.get('jwt')
      if (token) {
        UserStore.checkToken(token)
        if (isWhiteName) {
          if (Storage.get('current_user') && UserStore.userMsg.init) {
            UserStore.setCurrentuserToPinia()
          }
          return whiteListLink(to, from)
        } else {
          if (!Storage.get('current_user')) {
            UserStore.setCurrentuser()
              .then(() => {
                return router.replace({ ...to, force: true })
              })
              .catch(err => {
                console.error(err)
                if (isWhiteName) {
                  return true
                } else {
                  UserStore.logoutToPage()
                }
              })
          } else {
            return whiteListLink(to, from)
          }
        }
      } else {
        if (isWhiteName) {
          return true
        } else {
          if (appTheme.isPublicLoginDefault) {
            UserStore.logout()
              .then(() => {
                return router.push({ ...to })
              })
              .catch(() => {
                return UserStore.noAuthLinkTo()
              })
          } else {
            if (UserStore.userMsg.init) {
              await UserStore.logout()
              PermissionStore.GenerateRoutesAddRoute(true)
                .then(() => {
                  routerLinkTo(to, from)
                })
                .catch(err => {
                  console.error(err)
                  showNotification(t('f_msg_menuGetFaild'))
                })
            } else {
              UserStore.logoutToPage()
            }
          }
        }
      }
    }
  })
  router.afterEach(async (to, from) => {
    // 多语言的标签页名称
    const i18nkey = to.meta?.i18nkey
    const title = to?.meta?.title ? to.meta.title + ' | ' : ''
    document.title = `${i18nkey ? t(i18nkey) + ' | ' : title}${t('f_TITLE')}`

    // 结束loading
    const Loading = window['$loading'] || null
    Loading && Loading.finish()

    // 移除页面loading动画节点
    if (to.name) {
      AppStore.setLoading(false)
    }

    // 维护hidden的情况
    const noAddTab = [...constantRouter.map(v => v.name), 'Redirect']
    if (!noAddTab.some(v => v === to.name)) {
      MenuHiddenStore.setHiddenList(to, from)
    }
  })

  router.onError(error => {
    // router.push('/page-building')
    console.error(error)
  })
}
