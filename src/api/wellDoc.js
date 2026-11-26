import request from '@/utils/request'
import axios from 'axios'
import { Message } from 'element-ui'
import { getToken } from '@/utils/auth'

/**
 * 工作台「井文档」接口
 * 后端：WellDocumentController（/api/v1/workbench/well）
 *
 * 说明：multipart 的文本字段会被 Tomcat 按 ISO-8859-1 解码，
 * 中文（井名 / 备注）一律走 query，不走 FormData。
 */

/** 文档类型字典 */
export function getDocTypes() {
  return request({
    url: '/v1/workbench/well/doc/types',
    method: 'get'
  })
}

/** 文档中心连通性自检 */
export function getDocCenterStatus() {
  return request({
    url: '/v1/workbench/well/doc/status',
    method: 'get'
  })
}

/**
 * 查询井号下的文档列表
 * @param {String} wbWellId 工作台井号 ID
 * @param {Object} params { docType, onlyCurrent }
 */
export function listWellDocs(wbWellId, params) {
  return request({
    url: `/v1/workbench/well/${wbWellId}/doc`,
    method: 'get',
    params
  })
}

/**
 * 按井名查询文档（未关联井库的井号用）
 *
 * ⚠️ 务必同时传 wbWellId：同名井「删除后重建」会留下多条文档记录，
 *    只按井名查会把上一轮已删除井的历史文档一起返回。
 *    传了 wbWellId 后后端按井主键精确匹配。
 *
 * @param {String} wellName
 * @param {String} [wbWellId] 工作台井主键
 */
export function listDocsByWellName(wellName, wbWellId) {
  return request({
    url: '/v1/workbench/well/doc/by-name',
    method: 'get',
    params: { wellName, wbWellId }
  })
}

/** 查询单条 */
export function getWellDoc(docId) {
  return request({
    url: `/v1/workbench/well/doc/${docId}`,
    method: 'get'
  })
}

/**
 * 上传文档并关联井号
 * @param {String} wbWellId
 * @param {File} file
 * @param {Object} opts { docType, wellName, remark, userId }
 * @param {Function} onProgress 进度回调（0-100）
 */
export function uploadWellDoc(wbWellId, file, opts = {}, onProgress) {
  const form = new FormData()
  form.append('file', file)

  const query = { docType: opts.docType || 'OTHER' }
  if (opts.wellName) query.wellName = opts.wellName
  if (opts.remark) query.remark = opts.remark
  if (opts.userId) query.userId = opts.userId

  const url = wbWellId
    ? `/v1/workbench/well/${wbWellId}/doc/upload`
    : '/v1/workbench/well/doc/upload'

  return request({
    url,
    method: 'post',
    params: query,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
    onUploadProgress: e => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
  })
}

/**
 * 下载文档（返回 Blob）
 *
 * 后端在「文档中心不可达」时会先回退到本地存储；两者都没有才返回 500，
 * 且响应体是一段可读中文说明。这里把该说明读出来，替换掉 axios 那句
 * 干巴巴的「Request failed with status code 500」，便于用户判断下一步。
 */
export function downloadWellDoc(docId) {
  return request({
    url: `/v1/workbench/well/doc/${docId}/download`,
    method: 'get',
    responseType: 'blob',
    timeout: 600000
  }).catch(async err => {
    const res = err && err.response
    if (res && res.data instanceof Blob) {
      let text = ''
      try {
        text = await res.data.text()
      } catch (e) {
        text = ''
      }
      if (text && text.trim() && text.trim().charAt(0) !== '<') {
        const e = new Error(text.trim())
        e.isServerMessage = true
        throw e
      }
    }
    throw err
  })
}

/**
 * 预览文档：需要读取 X-File-Name 响应头，因此不走统一拦截器（拦截器只返回 data）。
 * @returns {Promise<{blob: Blob, fileName: string}>}
 */
export function previewWellDoc(docId) {
  const token = getToken()
  return axios({
    baseURL: process.env.VUE_APP_BASE_API,
    url: `/v1/workbench/well/doc/${docId}/preview`,
    method: 'get',
    responseType: 'blob',
    timeout: 600000,
    headers: token ? { Authorization: token } : {}
  }).then(res => {
    const raw = res.headers['x-file-name'] || ''
    let fileName = ''
    try {
      fileName = raw ? decodeURIComponent(raw) : ''
    } catch (e) {
      fileName = raw
    }
    return { blob: res.data, fileName }
  }).catch(async err => {
    // 后端失败时 500 的正文是一段可读中文原因（如「文档中心中找不到该文件…原因：404」）。
    // 注意：responseType='blob' 时这段文字也是 Blob，必须读出来；
    // 之前只用了 statusText，用户永远看到英文 "Internal Server Error"，
    // 真实原因被彻底埋掉 —— 这正是线上「文档访问不通却查不出原因」的最后一环。
    const res = err && err.response
    let text = ''
    if (res && res.data instanceof Blob) {
      try {
        text = await res.data.text()
      } catch (e) {
        text = ''
      }
    }
    const msg = (text && text.trim() && text.trim().charAt(0) !== '<')
      ? text.trim()
      : ((res && res.statusText) || '预览加载失败')
    Message.error({ message: msg, duration: 8000, showClose: true })
    const wrapped = new Error(msg)
    wrapped.isServerMessage = true
    wrapped.originalError = err
    return Promise.reject(wrapped)
  })
}

/** 逻辑删除 */
export function deleteWellDoc(docId, userId) {
  return request({
    url: `/v1/workbench/well/doc/${docId}`,
    method: 'delete',
    params: { userId }
  })
}
