/**
 * 部署路径工具
 *
 * 本项目发布形态：
 *   https://www.hbepicp.petrochina/dh-desdoc-cbm/#/
 *
 * 前端使用 hash 路由，且被部署在子路径 /dh-desdoc-cbm/ 下。
 * 因此任何「手工拼绝对地址」的地方都不能写成
 *   window.location.origin + '/#' + path      ← 会丢掉 /dh-desdoc-cbm/ 前缀
 * 必须统一走 publicPath() + absoluteUrl()。
 *
 * publicPath 来源优先级：
 *   1. process.env.BASE_URL（vue-cli 注入，等于 vue.config.js 的 publicPath）
 *   2. 兜底 '/dh-desdoc-cbm/'
 */

const FALLBACK_PUBLIC_PATH = '/dh-desdoc-cbm/'

/**
 * 当前站点的部署子路径，始终以 / 开头且以 / 结尾。
 * 例：'/dh-desdoc-cbm/'
 */
export function publicPath() {
  let p = process.env.BASE_URL
  if (!p || p === '/' || p === './') {
    p = FALLBACK_PUBLIC_PATH
  }
  if (!p.startsWith('/')) p = '/' + p
  if (!p.endsWith('/')) p = p + '/'
  return p
}

/**
 * 把应用内路由路径转成可用的完整 URL（hash 模式）。
 *
 * @param {string} routePath 应用内路径，如 '/' 或 '/report-generate/index'
 * @returns {string} 形如 https://host/dh-desdoc-cbm/#/report-generate/index
 */
export function absoluteUrl(routePath) {
  let p = routePath || '/'
  if (p.startsWith('#')) p = p.slice(1)
  if (!p.startsWith('/')) p = '/' + p
  return window.location.origin + publicPath() + '#' + p
}

/**
 * 把应用内路由路径转成相对部署路径（不含 origin），用于 window.open 等场景。
 *
 * @param {string} routePath 应用内路径
 * @returns {string} 形如 /dh-desdoc-cbm/#/report-generate/index
 */
export function relativeUrl(routePath) {
  let p = routePath || '/'
  if (p.startsWith('#')) p = p.slice(1)
  if (!p.startsWith('/')) p = '/' + p
  return publicPath() + '#' + p
}
