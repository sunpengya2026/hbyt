import axios from 'axios'
import { getToken } from '@/utils/auth'

/**
 * 统一认证（base-auth-service）专用请求实例
 *
 * 为什么不复用 @/utils/request：
 *   1. 响应体结构不同 —— 统一认证返回
 *        { "code": "ERROR-TOKEN-NULL", "message": "...", "data": null }   // 失败
 *        { "code": "0", "message": "成功", "data": { ... } }              // 成功（推断）
 *      code 是**字符串**，而本项目约定是数字 0/200。
 *      复用会让拦截器把成功响应当失败 reject 掉。
 *   2. 认证方式不同 —— 统一认证要 Authorization 头带 IDEAS 的 token，
 *      而本项目 token 是本地 mock 的 free-login-token，混在一起会互相覆盖。
 *   3. 失败必须静默降级 —— 姓名拿不到不能弹 Message.error 打扰用户，
 *      也不能触发「登录失效 → 跳登录页」的逻辑。
 *
 * 地址（同源，不走跨域）：
 *   开发  /api-proxy  → devServer 代理到 VUE_APP_AUTH_BASE_URL
 *   生产  /api        → 网关直接转 base-auth-service
 * 见 vue.config.js 的 proxy 配置与 .env.* 里的 VUE_APP_AUTH_BASE_API。
 */
const authService = axios.create({
  baseURL: process.env.VUE_APP_AUTH_BASE_API || '/api',
  timeout: 8000 // 姓名拿不到不值得等，8 秒足够
})

authService.interceptors.request.use(
  config => {
    // 统一认证要的是 IDEAS 域的 token，而不是本项目的 free-login-token。
    // 由调用方显式传入；没传就不带头（后端会返回 ERROR-TOKEN-NULL，走降级）。
    if (!config.headers['Authorization']) {
      const ideasToken = getIdeasToken()
      if (ideasToken) config.headers['Authorization'] = ideasToken
    }
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json; charset=UTF-8'
    }
    return config
  },
  error => Promise.reject(error)
)

/**
 * 取 IDEAS 统一认证的 token
 *
 * 门户（qiankun / iframe / 跳转）带过来的凭据形式尚未最终确认，这里按常见三种顺序兜底：
 *   1. 地址栏参数 ?eisctoken= / ?jwt= / ?token=   —— 参考项目 5370dh-cbm-front 用 ?eisctoken=
 *   2. localStorage 里门户写入的 token
 *   3. 同源 cookie（cookie 由浏览器自动带上，不需要塞 Authorization 头）
 *
 * 拿到后写回本地，后续请求复用，避免每次刷新都重新解析地址栏。
 */
const IDEAS_TOKEN_KEY = 'ideas-auth-token'

export function getIdeasToken() {
  const saved = localStorage.getItem(IDEAS_TOKEN_KEY)
  if (saved) return saved

  try {
    const q = new URLSearchParams(window.location.search || '')
    const hash = window.location.hash || ''
    const qs = hash.indexOf('?') >= 0 ? new URLSearchParams(hash.slice(hash.indexOf('?') + 1)) : null
    const keys = ['eisctoken', 'jwt', 'token', 'access_token']
    for (const k of keys) {
      const v = q.get(k) || (qs && qs.get(k))
      if (v) {
        localStorage.setItem(IDEAS_TOKEN_KEY, v)
        return v
      }
    }
  } catch (e) {
    // 解析地址栏失败不影响主流程
  }
  return ''
}

export function setIdeasToken(token) {
  if (token) localStorage.setItem(IDEAS_TOKEN_KEY, token)
}

export function removeIdeasToken() {
  localStorage.removeItem(IDEAS_TOKEN_KEY)
}

/**
 * 当前登录用户（统一认证）
 *
 * GET {VUE_APP_AUTH_BASE_API}/base-auth-service/curuser
 *
 * ⚠️ 这个实例**不做**全局响应拦截里的错误提示/跳登录，
 *    由调用方（store/modules/user.js）决定怎么降级。
 */
export function getCurUser() {
  return authService({
    url: '/base-auth-service/curuser',
    method: 'get'
  }).then(res => res.data)
}

export default authService
