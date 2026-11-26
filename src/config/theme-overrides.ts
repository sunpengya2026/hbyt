import { GlobalThemeOverrides } from 'naive-ui'
import {  mxDarkTheme } from 'udp/config/default-theme-overrides'
import { mergeTheme } from 'udp/utils/color'
import themeConfig from 'udp/assets/theme-config'
interface Theme {
  color: string
  name: string
  i18nkey?: string
}

// 默认主题色
export const theme = '#0080EB'

// 浅色主题
export const lightThemeOverrides = (theme: string): GlobalThemeOverrides => {
  // return mergeTheme(mxLightTheme(theme), {})
  return themeConfig(theme)
}

// 深色主题
export const darkThemeOverrides = (theme: string): GlobalThemeOverrides => {
  return mergeTheme(mxDarkTheme(theme), {})
}

// 默认主题
export const themeMode: 'light' | 'dark' = 'light'

// 主题色配置
export const themeArr: Array<Theme> = [
  {
    color: theme,
    name: '企业蓝',
    i18nkey: 'theme.f_blue'
  },
  {
    color: '#c43b3b',
    name: '石油红',
    i18nkey: 'theme.f_red'
  }
]

// menuTop：是否展示头部菜单。若无头部菜单，为0;若展示，有几级写几即可;若全部由头菜单展示，则为Infinity
export const menuTop = 0

// 是否设计标签页缓存,若使用标签页缓存，则不能设置多路径公用一个component的情况，否则会出错
export const tabKeepAlive = true

// 页面展示方式
export const pageLayout: 'singlePage' | 'topPage' | 'menuPage' | undefined | null = null

// 登录的地址
// export const loginUrl = '/login'

// 登出的地址
// export const logoutUrl = '/login'

// 登出后跳转的地址
// export const logoutedToPage = '/'

// public用户直接跳转到登录页
// export const isPublicUserToLoginPage = false

// 是否显示内容区动画
export const isContentAnimation = true

// 多语言——默认的语言
export const defaultLanguage = 'zh_CN'

// 多语言——若不从后台请求多语言数据，则在配置此处配置言切换的多语言id数组,如['zh_CN', 'en_GB'] 否则为null
export const noQueryLanguage = ['zh_CN', 'en_GB']

// 多语言——自定义多语言请求的类型，默认（值为null时）为['menu', 'front', 'data']，可配置其中的一个或多个，如['menu', 'front']、['menu']
export const definedQueryLanguageType = null

// 错误页面跳转地址
export const ErrorPageRedirect = null

// 头部菜单可展示图标
export const isHeaderMenuIconShow = false

// 没有设置菜单图标时，是否不展示默认图标
export const isHiddenDefaultIcon = false

// 登录页是否显示“记住我”
export const isRememberMeShow = false

// 请求的公共uri
// export const baseUri = '/'

// 此项目自有页面是否统一登出
export const isLogoutLinkage = false

// 请求超时时长
// export const timeout = 6000

// 是否忽略用户没有租户的情况下提示开通租户权限的信息
export const isIgnoreNoTenantMessage = false

// 401直接登出并跳转
export const isUnauthorizedJumpToLoginPage = false

// 不请求租户列表，即tenantCode的切换不被tenantList控制（常用于子应用）
// export const noQueryTenantList = false

// 使用public默认登录
export const isPublicLoginDefault = false
