import request from '@/utils/request'
import axios from 'axios'
import { getToken } from '@/utils/auth'

/**
 * 读取Word文档批注
 */
export function readAnnotationsApi(formData) {
  return request({
    url: '/v1/annotation/read',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 保存批注数据获取方式
 */
export function saveAnnotationDataApi(data) {
  return request({
    url: '/v1/annotation/save',
    method: 'post',
    data
  })
}

/**
 * 获取已保存的批注记录
 */
export function getAnnotationRecordsApi(params) {
  return request({
    url: '/v1/annotation/records',
    method: 'get',
    params
  })
}

/**
 * 删除批注记录
 */
export function deleteAnnotationRecordApi(id) {
  return request({
    url: `/v1/annotation/record/${id}`,
    method: 'delete'
  })
}

/**
 * 读取文档结构
 */
export function readDocumentStructureApi(formData) {
  return request({
    url: '/v1/annotation/structure',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 生成文档（调用大模型）
 */
export function generateDocumentApi(formData) {
  return request({
    url: '/v1/annotation/generate',
    method: 'post',
    data: formData,
    responseType: 'blob',
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 读取文档内容用于编辑器
 * @param {FormData} formData 含 file 字段
 * @param {String} [wellName] 目标井名；非空时后端会对表格按井号筛选
 *        （注意：必须作为 URL query 传，multipart 文本字段中文会乱码）
 */
export function readDocumentContentApi(formData, wellName) {
  return request({
    url: '/v1/annotation/content',
    method: 'post',
    params: wellName ? { wellName } : undefined,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 获取支持的提取字段列表
 */
export function getExtractionFieldsApi() {
  return request({
    url: '/v1/geological-extraction/fields',
    method: 'get'
  })
}

/**
 * 智能提取并生成地质设计文档
 */
export function extractAndGenerateApi(formData) {
  return request({
    url: '/v1/geological-extraction/extract-and-generate',
    method: 'post',
    data: formData,
    responseType: 'blob',
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 仅执行提取，返回提取结果
 */
export function extractOnlyApi(formData) {
  return request({
    url: '/v1/geological-extraction/extract-only',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 分析文档并生成提取规则
 */
export function analyzeDocumentsApi(formData) {
  return request({
    url: '/v1/extraction-rules/analyze',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 获取所有保存的提取规则
 */
export function getRulesListApi() {
  return request({
    url: '/v1/extraction-rules/list',
    method: 'get'
  })
}

/**
 * 获取单个规则详情
 */
export function getRuleDetailApi(ruleId) {
  return request({
    url: `/v1/extraction-rules/${ruleId}`,
    method: 'get'
  })
}

/**
 * 使用指定规则提取数据
 */
export function extractWithRuleApi(ruleId, formData) {
  return request({
    url: `/v1/extraction-rules/extract/${ruleId}`,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 删除提取规则
 */
export function deleteRuleApi(ruleId) {
  return request({
    url: `/v1/extraction-rules/${ruleId}`,
    method: 'delete'
  })
}

/**
 * 流式提取 - 获取文档章节列表
 */
export function streamingExtractSectionsApi(formData) {
  return request({
    url: '/v1/streaming-extraction/sections',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 流式提取 - 提取单个章节
 */
export function streamingExtractSectionApi(formData) {
  return request({
    url: '/v1/streaming-extraction/extract-section',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 流式提取 - 一次性提取所有章节
 */
export function streamingExtractAllApi(formData) {
  return request({
    url: '/v1/streaming-extraction/extract-all',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 流式生成/提取（SSE）
 * 直接使用 fetch 读取 text/event-stream，逐条回调解析出的事件。
 * 后端返回格式为标准 SSE：`event: <name>\ndata: <json>\n\n`
 *
 * @param {FormData} formData - 表单数据（至少包含 file 字段）
 * @param {Object} handlers
 * @param {(eventName:string, data:Object)=>void} handlers.onEvent - 收到一条 SSE 事件
 * @param {AbortSignal} [handlers.signal] - 用于中断请求
 * @param {Array|string} [handlers.annotations] - 批注规则数组（含章节结构与源文件数据），
 *        作为 form 字段 annotations 传给后端（避免放 URL query 导致超长 400）。
 * @returns {Promise<void>}
 */
export async function streamGenerateApi(formData, { onEvent, signal, annotations } = {}) {
  const baseUrl = process.env.VUE_APP_BASE_API || '/api'
  const url = `${baseUrl}/v1/annotation/generate/stream`

  // annotations 作为 form 字段传入（后端支持；数据量大时不能放 URL query，会 400）
  if (annotations) {
    const annStr = typeof annotations === 'string' ? annotations : JSON.stringify(annotations)
    formData.append('annotations', annStr)
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    signal
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  if (!response.body) {
    throw new Error('当前环境不支持流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let eventName = ''
  const dataLines = []

  // 处理一条完整 SSE 事件块
  const flush = () => {
    if (dataLines.length === 0) {
      eventName = ''
      return
    }
    const raw = dataLines.join('\n')
    let data = raw
    try {
      data = JSON.parse(raw)
    } catch (e) {
      // 非 JSON 时保留原文
    }
    if (onEvent) onEvent(eventName || 'message', data)
    eventName = ''
    dataLines.length = 0
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let idx
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, '')
      buffer = buffer.slice(idx + 1)

      if (line === '') {
        // 空行 = 事件结束
        flush()
        continue
      }
      if (line.startsWith(':')) continue // 注释行
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''))
      }
    }
  }
  // 处理流末尾残留
  flush()
}

/**
 * 提取文档中的图片
 * @param {FormData} formData - 至少包含 file 字段
 * @param {boolean} [performOcr] - 是否对图片做 OCR（默认 false，纯提取不需要）
 */
export function extractDocumentImagesApi(formData, performOcr) {
  return request({
    url: '/v1/document-parse/extract-images',
    method: 'post',
    params: typeof performOcr === 'boolean' ? { performOcr } : undefined,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 对图片进行OCR识别
 */
export function ocrImageApi(formData) {
  return request({
    url: '/v1/document-parse/ocr-image',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 提取文档中的表格
 */
export function extractDocumentTablesApi(formData) {
  return request({
    url: '/v1/document-parse/extract-tables',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 导出当前编辑器内容为 Word 文档（docx）
 *
 * 注意：请求体是 JSON，不能走 multipart（Tomcat 按 ISO-8859-1 解码会导致中文乱码）。
 * 响应是 Blob 本身（request 拦截器对 responseType==='blob' 直接返回 response.data）。
 *
 * @param {{html: string, fileName: string}} data
 * @returns {Promise<Blob>}
 */
export function exportWordApi(data) {
  return request({
    url: '/v1/annotation/export-word',
    method: 'post',
    data,
    responseType: 'blob',
    timeout: 120000
  })
}

/**
 * 导出 Word 并读取响应头（需要拿 X-Doc-Center-Status 判断文档中心同步结果）。
 *
 * 统一拦截器对 blob 只返回 response.data，拿不到 headers，
 * 因此这里用独立 axios 实例（与 previewWellDoc 同理）。
 *
 * @returns {Promise<{blob: Blob, docCenterStatus: string}>}
 *   docCenterStatus 形如 `ok:<fileId>` / `failed:<msg>` / `skipped`
 */
export function exportWordWithMetaApi(data) {
  const token = getToken()
  return axios({
    baseURL: process.env.VUE_APP_BASE_API,
    url: '/v1/annotation/export-word',
    method: 'post',
    data,
    responseType: 'blob',
    timeout: 600000,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=UTF-8' },
      token ? { Authorization: token } : {}
    )
  }).then(res => ({
    blob: res.data,
    docCenterStatus: res.headers['x-doc-center-status'] || ''
  }))
}

/**
 * 导出表格数据（CSV/MD/JSON）
 */
export function exportTableDataApi(params) {
  return request({
    url: '/v1/document-parse/export-tables',
    method: 'get',
    params,
    responseType: 'blob'
  })
}
