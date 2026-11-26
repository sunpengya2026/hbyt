import request from '@/utils/request'

/**
 * 分段射孔方案表 API（保存 / 查询 / 下载）
 *
 * 后端 context-path = /api，axios 的 baseURL 也是 /api（见 .env.development），
 * 所以这里一律写 /v1/xxx，不能写 /api/v1/xxx，否则会拼成 /api/api/v1/...
 */
const BASE_URL = '/v1/agent/perforation/tables'

/**
 * 保存两张表（分段射孔方案计算 + 煤岩破碎指数）
 *
 * 后端一次事务写入，同井同表类型会自动 VERSION_NO + 1，
 * 上一版置为历史版本（IS_CURRENT = '0'）。
 *
 * @param {Object} data { wbWellId, wellName, perforationMethod, avoidDistance,
 *                        mseThreshold, maxShift, segPlan: [], crushIdx: [], remark }
 */
export function savePerforationTables(data) {
  return request({
    url: `${BASE_URL}/save`,
    method: 'post',
    data
  })
}

/**
 * 查询某井当前版本的两张表（进页面自动回填）
 * @param {String} wbWellId
 */
export function getCurrentPerforationTables(wbWellId) {
  return request({
    url: `${BASE_URL}/current`,
    method: 'get',
    params: { wbWellId }
  })
}

/**
 * 查询某井的保存历史（仅表头，用于版本下拉）
 * @param {String} wbWellId
 */
export function listPerforationTableHistory(wbWellId) {
  return request({
    url: `${BASE_URL}/history`,
    method: 'get',
    params: { wbWellId }
  })
}

/**
 * 逻辑删除一次保存
 * @param {String} tableId
 * @param {String} userId
 */
export function deletePerforationTable(tableId, userId) {
  return request({
    url: `${BASE_URL}/${tableId}`,
    method: 'delete',
    params: { userId }
  })
}

/**
 * 下载表格的 URL。
 *
 * 用 URL 而非 blob：下载是浏览器原生行为（Content-Disposition 已带中文名），
 * 走 window.open / a[href] 最省事，也不会被 axios 拦截器当成 JSON 解析。
 *
 * @param {String} format   xlsx / docx / csv
 * @param {Object} opts     { tableId, wbWellId, scope }
 *                          tableId 传 'latest' 时取该井当前版本
 *                          scope 传 'segPlan' / 'crushIdx' 只导单张表，缺省 'all' 两张一起导
 * @returns {String}
 */
export function perforationTableDownloadUrl(format, opts = {}) {
  const base = process.env.VUE_APP_BASE_API || '/api'
  const tableId = opts.tableId || 'latest'
  const qs = [`format=${encodeURIComponent(format)}`]
  if (opts.scope && opts.scope !== 'all') qs.push(`scope=${encodeURIComponent(opts.scope)}`)
  if (opts.wbWellId) qs.push(`wbWellId=${encodeURIComponent(opts.wbWellId)}`)
  return `${base}${BASE_URL}/${tableId}/download?${qs.join('&')}`
}
