import request from '@/utils/request'
import axios from 'axios'
import { getToken } from '@/utils/auth'

/**
 * 文档格式模板 / 射孔方式模板 API
 *
 * 后端 context-path = /api，所以这里一律写 /v1/xxx。
 */

// 列出全部模板（含内置默认模板）
export function getDocTemplateList() {
  return request({
    url: '/v1/doc-template/list',
    method: 'get'
  })
}

// 列出支持的射孔方式及绑定状态
export function getPerforationMethods() {
  return request({
    url: '/v1/doc-template/perforation-methods',
    method: 'get'
  })
}

// 按射孔方式取模板
export function getTemplateByMethod(method) {
  return request({
    url: '/v1/doc-template/by-method',
    method: 'get',
    params: { method }
  })
}

/**
 * 上传射孔方式模板（文件 → 文档中心，元信息 → COMM_DOC_TEMPLATE）
 *
 * 注意：method / templateName / remark 都是中文，必须走 query 传参。
 * Tomcat 按 ISO-8859-1 解码 multipart 文本字段，放 FormData 会乱码。
 */
export function uploadPerforationTemplate({ file, method, templateName, remark, userId }) {
  const form = new FormData()
  form.append('file', file)
  return request({
    url: '/v1/doc-template/upload',
    method: 'post',
    params: { method, templateName, remark, userId },
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })
}

// 更新模板元信息
export function updateDocTemplate(templateId, data) {
  return request({
    url: `/v1/doc-template/${templateId}`,
    method: 'put',
    data
  })
}

// 逻辑删除模板
export function deleteDocTemplate(templateId) {
  return request({
    url: `/v1/doc-template/${templateId}`,
    method: 'delete'
  })
}

// 下载模板文件（文档中心回源）
export function downloadDocTemplate(templateId) {
  return request({
    url: `/v1/doc-template/${templateId}/download`,
    method: 'get',
    responseType: 'blob'
  })
}

/**
 * 预览模板文件：需要读取 X-File-Name 响应头，因此走原生 axios。
 *
 * ⚠️ responseType 是 blob，所以后端返回的错误 JSON 也是一个 Blob，
 * 必须读出来解析，否则只会显示笼统的「预览加载失败」，无法定位。
 * 后端在「文档中心不可达且本地无副本」时返回 503 + {code:-1,message:"..."}。
 *
 * @returns {Promise<{blob: Blob, fileName: string}>}
 */
export function previewDocTemplate(templateId) {
  const token = getToken()
  return axios({
    baseURL: process.env.VUE_APP_BASE_API,
    url: `/v1/doc-template/${templateId}/preview`,
    method: 'get',
    responseType: 'blob',
    timeout: 60000,
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
    const resp = err && err.response
    let msg = ''
    // 后端错误体是 Blob（因为 responseType=blob），读出来才能拿到 message
    if (resp && resp.data instanceof Blob) {
      try {
        const text = await resp.data.text()
        const json = JSON.parse(text)
        msg = json.message || json.msg || ''
      } catch (e) {
        msg = ''
      }
    } else if (resp && resp.data && typeof resp.data === 'object') {
      msg = resp.data.message || resp.data.msg || ''
    }
    if (!msg) {
      if (resp && resp.status === 404) msg = '该模板尚未上传文件'
      else if (resp && resp.status) msg = `预览加载失败（HTTP ${resp.status}）`
      else if (err && err.message && err.message.indexOf('timeout') >= 0) msg = '预览加载超时，文件可能较大'
      else msg = '预览加载失败'
    }
    return Promise.reject(new Error(msg))
  })
}

// 取默认模板
export function getDefaultDocTemplate() {
  return request({
    url: '/v1/doc-template/default',
    method: 'get'
  })
}
