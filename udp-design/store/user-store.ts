import { defineStore } from 'pinia'
import { appCodeStorage, noPrefixStorage } from 'udp/utils/Storage'
import { currentuser, login } from 'udp/api/user'
import { udpPermissionStore } from 'udp/store/permission-store'
import type { RouteLocationNormalized } from 'vue-router'
import { router } from 'udp/router'
import * as config from '@/config/theme-overrides'
import plugin from '@/config/plugin'
import { isLocalLogin, isLocalLogout } from 'udp/config/computed-constant'
import { queryUserTenantList } from 'udp/api/user'
import { i18n } from 'udp/lang'
import { h } from 'vue'

import queryEnvConfigMap from 'udp/api/env-change-url-config'
import { systemModules } from 'udp/store/views-module'
import { AuthApi } from 'udp/types/auth'
import { getPermissionMenu, logoutApi } from 'udp/api/login'
import Encrypt from 'encryptlong'
const encryptor = new Encrypt()
encryptor.setPublicKey(
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCb/M829VUWazt6NrV3Gn7BcoHP+K8Vw4wReSCs9L6kXh+EYwvUpMBwpXHx897jNts3wV2M9tyjuOvg21cR+JzvvLc7oUQ8vBIpmfSiSA5rJM9L7HeYPqbqyd3gmlVfAQ+YzBQx4wNwhyr1dZ+mo6e9WFlesNTqgOvZmNEfbdu4CQIDAQAB'
)
const systemConfig = systemModules['../../src/config/system-config.ts']
interface UserMsg {
  dataRegion: string
  displayName: string
  loginName: string
  organization: string
  userId: string  
  isThirdPartyLogin: boolean
  init?: boolean
}
interface tenantItem {
  code: string
  name: string
  id?: string
  parentId?: string
}
interface UserStore {
  token: string
  tenantId: string
  userMsg: UserMsg
  iamLogin: boolean
  isPublicUser: boolean
  tenantCode: string
  tenantList: tenantItem[]
  envMap: Record<string, any>
}

export const encodeURIFormate = (uri: string) => {
  return encodeURIComponent(decodeURIComponent(uri))
}

// 初始化状态管理器时 tenantId 通过环境变量UDP_APP_TENANT_ID引入
const tenantId = import.meta.env.UDP_APP_TENANT_ID
noPrefixStorage.set('tenantId', tenantId)
export const udpUserStore = defineStore('user-store', {
  state: (): UserStore => ({
    token: '',
    tenantId: tenantId,
    userMsg: {
      dataRegion: '',
      displayName: '',
      loginName: '',
      organization: '',
      userId: '',
      init: true,
      isThirdPartyLogin: false
    },
    iamLogin: false,
    isPublicUser: true,
    tenantCode: '',
    tenantList: [],
    envMap: {}
  }),
  getters: {
    // 获取token，用于请求认证
    getToken(): string {
      return this.token || noPrefixStorage.get('jwt') || ''
    },
    // 获取tenantId，用于请求认证
    getTenantId(): string {
      return this.tenantId || noPrefixStorage.get('tenantId') || ''
    },  
    // 当前url的path前的部分
    baseUrl(): string {
      return window.location.origin + router.options.history.base
    },
    // Route
    currentRoute(): RouteLocationNormalized {
      return router.currentRoute.value
    },
    // loginUrl处理
    loginUrlFormate(): string {
      const current = encodeURIFormate(this.currentRoute.fullPath)
      if (isLocalLogin) {
        return `/login?redirect=${current}`
      } else {
        let uri = ''
        const loginUrl = config.loginUrl
        const fullUrl = encodeURIFormate(`${this.baseUrl}${current}`)
        if (loginUrl.indexOf('${currentUrl}?') !== -1 && Object.keys(this.currentRoute.query).length) {
          uri = loginUrl.replace('${currentUrl}?', `${fullUrl}%26`)
        } else {
          uri = loginUrl.replace('${currentUrl}', fullUrl)
        }
        const base = import.meta.env.UDP_PUBLIC_URL
        if (uri.startsWith(base)) {
          uri = uri.slice(base.length)
        }
        return uri
      }
    },
    loginFullUrl(): string {
      const uri = this.loginUrlFormate
      if (/^((http|https|ftp):)?\/\//.test(uri)) {
        return uri
      } else {
        return `${this.baseUrl}${uri}`
      }
    },
    // 登出后的跳转地址
    logoutedToPage(): string {
      let uri = config.logoutedToPage
      if (uri) {
        if (/^((http|https|ftp):)?\/\//.test(uri)) {
          return uri
        } else {
          const base = import.meta.env.UDP_PUBLIC_URL
          if (uri.startsWith(base)) {
            uri = uri.slice(base.length)
          }
          return `${this.baseUrl}${uri}`
        }
      } else {
        return this.loginFullUrl
      }
    },
    // logoutUrl处理
    logoutUrlFormate(): string {
      const current = encodeURIFormate(this.currentRoute.fullPath)
      if (isLocalLogout) {
        return `/login?redirect=${current}`
      } else {
        let logoutUrl = config.logoutUrl
        if (logoutUrl.indexOf('${currentUrl}') !== -1) {
          const fullUrl = encodeURIFormate(`${this.baseUrl}${current}`)
          if (logoutUrl.indexOf('${currentUrl}?') !== -1 && Object.keys(this.currentRoute.query).length) {
            logoutUrl = logoutUrl.replace('${currentUrl}?', `${fullUrl}%26`)
          } else {
            logoutUrl = logoutUrl.replace('${currentUrl}', fullUrl)
          }
        }
        if (logoutUrl.indexOf('${loginUrl}') !== -1) {
          const loginUrl = encodeURIFormate(this.loginUrlFormate)
          if (logoutUrl.indexOf('${loginUrl}?') !== -1 && loginUrl.indexOf('?') !== -1) {
            logoutUrl = logoutUrl.replace('${loginUrl}?', `${loginUrl}%26`)
          } else {
            logoutUrl = logoutUrl.replace('${loginUrl}', loginUrl)
          }
        }
        if (logoutUrl.indexOf('${redirectUrl}') !== -1) {
          const redirectUrl = encodeURIFormate(this.logoutedToPage)
          if (logoutUrl.indexOf('${redirectUrl}?') !== -1 && redirectUrl.indexOf('?') !== -1) {
            logoutUrl = logoutUrl.replace('${redirectUrl}?', `${redirectUrl}%26`)
          } else {
            logoutUrl = logoutUrl.replace('${redirectUrl}', redirectUrl)
          }
        }
        return logoutUrl
      }
    }
  },
  actions: {
    getRememberMe(): boolean {
      return noPrefixStorage.get('rememberMe') || false
    },
    // 设置是否为iam登录
    setIamLogin(flag: boolean) {
      appCodeStorage.set('iam_login', flag)
      this.iamLogin = flag
    },
    // 设置token
    setToken(token: string) {
      noPrefixStorage.set('jwt', token)
      this.token = token
    },
    // 设置tenantId
    setTenantId(tenantId: string) {
      noPrefixStorage.set('tenantId', tenantId)
      this.tenantId = tenantId
    }, 
    // 设置refreshToken
    setRefreshToken(token: string) {
      noPrefixStorage.set('refresh_token', token)
    },
    // 检测token一致性
    checkToken(token: string) {
      if (token !== this.token) {
        this.token = token
      }
    },
    // 租户code存储
    async setTenant(tenant?: string) {
      if (tenant) {
        this.tenantCode = tenant
        appCodeStorage.set('tenantCode', tenant)
      } else if (!this.tenantCode) {
        await this.setSingleTenantCode()
      }
    },
    // 设置租户code
    async setTenantCode(tenant?: string) {
      if (tenant) {
        this.setTenant(tenant)
      } else {
        const list = this.tenantList
        const envMap = (await queryEnvConfigMap) as any
        const tenantCode =
          [this.tenantCode, appCodeStorage.get('tenantCode'), envMap.UDP_TENANT_CODE].find(
            c => c && list.find(v => v.code === c)
          ) ||
          list[0]?.code ||
          ''
          this.setTenant(tenantCode)
      }
    },
    // 设置单租户code
    async setSingleTenantCode() {
      const envMap = (await queryEnvConfigMap) as any
      const tenantCode = envMap.UDP_TENANT_CODE
      this.tenantList = []
      this.setTenant(tenantCode)
    },
    // 获取app的所有租户code
    // 获取app的所有租户code
    async setTenantList() {
      const envMap = (await queryEnvConfigMap) as any
      if (envMap.UDP_TENANT_SINGLE === 'true') {
        this.setSingleTenantCode()
      } else if (config.noQueryTenantList) {
        this.setTenant()
      } else {
        const appCode = window.udpGlobalConfig?.UDP_APP_CODE || import.meta.env.UDP_APP_CODE
        const systemConfigObj = systemConfig ? await systemConfig() : null
        const userTenantListResult =
          systemConfigObj?.default.customUserTenantList?.(appCode) || queryUserTenantList({ appCode })
        return userTenantListResult
          .then((res: any) => {
            if (res.result?.length) {
              this.tenantList = res.result.map((v: AuthApi.tenantResponseType) => ({
                code: v.tenantCode,
                name: v.name,
                id: v.id,
                parentId: v.parentId
              }))
            } else {
              this.tenantList = []
              const notification = window['$notification']
              if (notification && !this.isPublicUser && !config.isIgnoreNoTenantMessage) {
                const { t } = i18n.global
                notification.warning({
                  content: () => h('span', {}, t('f_confirm_tip')),
                  meta:  () => h('span', {}, t('f_msg_noTenant')),
                  duration: 8000
                })
              }
            }
          })
          .catch(() => {
            this.tenantList = []
          })
          .finally(() => {
            this.setTenantCode()
          })
      }
    },
    // 请求当前用户
    async setCurrentuser(token?: string) {
      if (token) {
        this.token = token
      }
      const systemConfigObj = systemConfig ? await systemConfig() : null
      return new Promise((resolve, reject) => {
        const currentuserResult = systemConfigObj?.default.customCurrentuser?.({userId: this.userMsg.userId,isThirdPartyLogin:this.userMsg.isThirdPartyLogin}) || currentuser()
        currentuserResult
          .then((msg: AuthApi.currentuserType) => {
            const flag = msg.flag
            const userMsg = msg.data || msg
            if (flag === false || !userMsg.id) {
              this.token = noPrefixStorage.get('jwt') ?? ''
              reject(userMsg)
            } else {
              this.userMsg = userMsg
              this.setUserMessageToStorage(userMsg)
              resolve(userMsg)
            }
          })
          .catch(error => {
            this.token = noPrefixStorage.get('jwt') ?? ''
            reject(error)
          })
      })
    },
    // 设置用户信息到store
    setCurrentuserToPinia() {
      this.userMsg = noPrefixStorage.get('current_user')
      this.isPublicUser = this.userMsg && this.userMsg.displayName ? this.userMsg.displayName === 'public' || !this.userMsg.displayName : true
    },
    // 设置用户信息
    setUserMessageToStorage(msg?: Record<string, string>) {
      const userMsg = {
        dataRegion: msg?.dataRegion ?? msg?.region ?? '',
        displayName: msg?.displayName ?? msg?.display_name ?? '',
        loginName: msg?.loginName ?? msg?.login_name ?? '',
        organization: msg?.belongOrg ?? msg?.organization ?? '',
        userId: msg?.id ?? msg?.user_id ?? ''
      }
      noPrefixStorage.set('current_user', userMsg)
    },
    // 登录
    async loginHandle(user: AuthApi.loginApi | string, isLogout?: boolean) {
      const PermissionStore = udpPermissionStore()
      const isPublicLogin = typeof user === 'string'
      const userFormate = isPublicLogin ? user : encryptor.encryptLong(JSON.stringify(user))
      const systemConfigObj = systemConfig ? await systemConfig() : null
      return new Promise((resolve, reject) => {
        const loginResult =
          systemConfigObj?.default.customLogin?.(isPublicLogin ? undefined : user, isPublicLogin) ||
          login({
            data: userFormate
          })
          console.log('systemConfigObj', loginResult)
          // systemConfigObj.default.customLogin({data: userFormate})
        loginResult
          .then(async(res: AuthApi.loginResponseType) => {
            // debugger
            console.log(res,'token信息')
            this.setToken(res.access_token)
            const { addRouterTransform } = plugin
            if (addRouterTransform) {            
              let menu= await getPermissionMenu()
              if(menu.code==0){
                noPrefixStorage.set('permissionList',menu.data)
              }
            }
            this.setRefreshToken(res.refresh_token)
            this.userMsg.userId = res.userId
            this.isPublicUser = false
            this.setCurrentuser(res.access_token)
            this.setIamLogin(false)
             if (isLogout && this.userMsg.displayName === 'public') {
              resolve(this.userMsg)
            } else {
              PermissionStore.GenerateRoutesAddRoute().then(() => {
                resolve(this.userMsg)
              })
            }
          })
          .catch(error => {
            reject(error)
          })
      })
    },
    // 设置token相关字段
    async setAllInfo(res: any, isLogout?: boolean) {
      const PermissionStore = udpPermissionStore()
      return new Promise(async(resolve, reject) => {
        if(!res){
          reject('认证码过期，请重新登陆')
          return
        }
        this.setToken(res.access_token)
        this.setRefreshToken(res.refresh_token)
        this.userMsg.userId = res.user_id
        this.userMsg.isThirdPartyLogin = res.isThirdPartyLogin
        this.isPublicUser = false
        this.setCurrentuser(res.access_token)
        const { addRouterTransform } = plugin
        if (addRouterTransform) {        
          let menu= await getPermissionMenu()
          if(menu.code==0){
            noPrefixStorage.set('permissionList',menu.data)
          }
        }
        // const {addRouterTransform}  = plugin
        // await addRouterTransform(PermissionStore.addRouters,res)
        if (isLogout && this.userMsg.displayName === 'public') {
          resolve(this.userMsg)
        } else {
          PermissionStore.GenerateRoutesAddRoute().then(() => {
            resolve(this.userMsg)
          })
        }
      })

      // this.setCurrentuser(res.access_token)
      // if (isLogout && this.userMsg.displayName === 'public') {
      //   resolve(this.userMsg)
      // } else {
      //   PermissionStore.GenerateRoutesAddRoute().then(() => {
      //     resolve(this.userMsg)
      //   })
      // }
    },    
    // 获取refreshToken
    getRefreshToken() {
      return noPrefixStorage.get('refresh_token')
    },
    // 刷新token
    doRefreshToken() {
      return new Promise<void>((resolve, reject) => {
        login({
          data: encryptor.encryptLong(
            JSON.stringify({
              grant_type: 'refresh_token',
              refresh_token: this.getRefreshToken()
            })
          )
        })
          .then((res: any) => {
            if (res) {
              this.setToken(res.access_token)
              this.setRefreshToken(res.refresh_token)
              this.setUserMessageToStorage(res)
              this.setCurrentuserToPinia()
              resolve()
            } else {
              reject()
            }
          })
          .catch(error => {
            reject(error)
          })
      })
    },
    // 登出
    logout(isLogout = true) {
      return new Promise<void>((resolve, reject) => {
        if (config.isPublicLoginDefault) {
          this.loginHandle(
            'Z37qiHmOr8B0W0J1zMo66HHb+I5M/97WMkhfcbXxtLF8N7c5jJbplfAZ3Z+mL+xIc1dQF3tgHRtwtdJsl7mSo5ObPK7pKBQDZSKg/NHVJ+dADN/sayHuJK6iet+eHylpNus75ErCCjOG9gKlX2YNzfrFFrjqsVJCktDMIcpyyA4=',
            isLogout
          )
            .then(() => {
              resolve()
            })
            .catch(() => {
              reject()
            })
        } else {
          this.token = ''
          this.userMsg = {
            dataRegion: '',
            displayName: '',
            loginName: '',
            organization: '',
            userId: ''
          }
          this.isPublicUser = true
          noPrefixStorage.remove('jwt')
          noPrefixStorage.remove('refresh_token')
          noPrefixStorage.remove('current_user')
          noPrefixStorage.remove('permissionList')
          this.setIamLogin(false)
          resolve()
        }
      })
    },
    // 登录地址跳转
    noAuthLinkTo() {
      const uri = this.loginUrlFormate
      if (/^((http|https|ftp):)?\/\//.test(uri)) {
        window.location.href = uri
      } else {
        router.push(uri)
      }
    },
    // 默认登出并跳转至登录页
    async localLogoutToPage(resolve: { (value: void | PromiseLike<void>): void; (): void }) {
      const envMap = (await queryEnvConfigMap) as any
      const loginType = envMap.UDP_LOGIN_TYPE
      const { logoutAfter } = plugin
      if ((loginType === '2' || loginType === '3') && appCodeStorage.get('iam_login')) {
        // iam登出
        const UdpIamLogout = envMap.UdpIamLogout
        logoutAfter && (await logoutAfter())
        window.location.href = UdpIamLogout.replace('${backUrl}', encodeURIFormate(this.logoutedToPage))
      } else {
        // 用户密码登出
        this.logout().finally(async () => {
          logoutAfter && (await logoutAfter())
          resolve()
          // window.location.replace(this.logoutedToPage)
        })
      }
    },
    // 登出并跳转至登录页
    logoutToPage(isLogin?: boolean) {
      const { logoutAfter } = plugin
      // eslint-disable-next-line no-async-promise-executor
      return new Promise<void>(async resolve => {
        if (isLogin) {
          console.log('logout退出')
          logoutApi().then(res => {
            if (res.data) {
              window.location.href = this.loginFullUrl
              this.logout(false)
              let loginType = localStorage.getItem('loginType')
              if (loginType === 'IAM') {
                window.open('https://tam.iam.cnpc/ngiam-rst/v1/sdk/login/logout')
              }


              localStorage.setItem('loginType', 'user')
            }
          }).catch()
        } else {
          const uri = this.logoutUrlFormate
          if (isLocalLogout || !/^((http|https|ftp):)?\/\//.test(uri)) {
            this.localLogoutToPage(resolve)
          } else {
            logoutAfter && (await logoutAfter())
            window.location.href = uri
          }
        }
      })
    },
    // 设置是否记住我
    setRememberMe(isRememberMe: boolean) {
      noPrefixStorage.set('rememberMe', isRememberMe)
    },
    // 设置env配置
    setEnvMap(envMap: Record<string, any>) {
      this.envMap = envMap
    },
    // 获取重定向的地址
    getCurrentRedirectUrl(from?: RouteLocationNormalized, toPath?: string) {
      const route = from || this.currentRoute
      const _r = route?.query?.redirect as string
      const reg = /^(\/404|\/403)\??/
      let linkPath = _r
      if (!_r || reg.test(_r) || (!_r.startsWith('http') && router.resolve({ path: _r }).name === 'ErrorPage')) {
        linkPath = toPath && router.resolve({ path: toPath }).name !== 'ErrorPage' ? toPath : '/'
      }
      return decodeURIComponent(linkPath)
    }
  }
})
