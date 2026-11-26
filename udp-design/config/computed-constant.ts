import * as config from '@/config/theme-overrides'

const logoutUrl = config.logoutUrl
const loginUrl = config.loginUrl

// 是否使用本地登录
export const isLocalLogin = !loginUrl || loginUrl === '/login'

// 是否使用本地退出
export const isLocalLogout = !logoutUrl || logoutUrl === '/login'

// 是否存在登录页面
export const isLocalLoginPage = isLocalLogin || isLocalLogout
