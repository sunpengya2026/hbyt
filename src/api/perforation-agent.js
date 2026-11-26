import request from '@/utils/request'

/**
 * 射孔方案智能体 API
 *
 * 后端 context-path = /api，axios 的 baseURL 也是 /api（见 .env.development），
 * 所以这里一律写 /v1/xxx，不能写 /api/v1/xxx，否则会拼成 /api/api/v1/...
 */
const BASE_URL = '/v1/agent/perforation'

/**
 * 获取射孔方案模板列表
 */
export function getPerforationTemplates() {
  return request({
    url: `${BASE_URL}/templates`,
    method: 'get'
  })
}

/**
 * 获取射孔方案智能体信息
 */
export function getPerforationInfo() {
  return request({
    url: `${BASE_URL}/info`,
    method: 'get'
  })
}

/**
 * 上传源文档（地质设计等）
 * @param {FormData} formData
 */
export function uploadPerforationSource(formData) {
  return request({
    url: `${BASE_URL}/upload-source`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 上传曲线文件
 * @param {FormData} formData
 */
export function uploadPerforationCurves(formData) {
  return request({
    url: `${BASE_URL}/upload-curves`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 按井号补取辅助曲线（只解析曲线，不重新生成方案表）
 *
 * 结构化表只存数值列，不含曲线；用户第二次进页面时两张表能从库里回填，
 * 但「煤岩破碎指数图」需要 MSE / 全烃 等几千个采样点才能画。
 * 图 tab 发现 curves 为空时调本接口，把工作台附件重新解析一遍。
 *
 * @param {String} wbWellId 工作台井号
 */
export function fetchPerforationCurves(wbWellId) {
  return request({
    url: `${BASE_URL}/curves`,
    method: 'get',
    params: { wbWellId }
  })
}

/**
 * 流式生成射孔方案（SSE）
 *
 * 不用 axios：项目拦截器只认 {code:0} 的 JSON，SSE 是 text/event-stream，
 * 会被它判成失败；用原生 fetch + ReadableStream 手工解析，边收边回调。
 *
 * @param {Object} params 参数对象
 * @param {Object} auxFiles 辅助文件 { sourceDoc, mseFile, casingCollarFile, totalHydrocarbonFile, gammaFile }
 * @param {Object} handlers { onEvent(event, data), onDone(result), onError(err), signal }
 * @returns {Promise<Object>} 最终结果
 */
export function generatePerforationStream(params, auxFiles, handlers = {}) {
  const fd = new FormData()
  Object.keys(params).forEach(k => {
    if (params[k] !== undefined && params[k] !== null) {
      fd.append(k, params[k])
    }
  })
  if (auxFiles.sourceDoc) fd.append('sourceDoc', auxFiles.sourceDoc)
  if (auxFiles.mseFile) fd.append('mseFile', auxFiles.mseFile)
  if (auxFiles.casingCollarFile) fd.append('casingCollarFile', auxFiles.casingCollarFile)
  if (auxFiles.totalHydrocarbonFile) fd.append('totalHydrocarbonFile', auxFiles.totalHydrocarbonFile)
  if (auxFiles.gammaFile) fd.append('gammaFile', auxFiles.gammaFile)

  const base = process.env.VUE_APP_BASE_API || '/api'

  return fetch(`${base}/v1/agent/perforation/generate/stream`, {
    method: 'POST',
    body: fd,
    signal: handlers.signal,
    headers: { Accept: 'text/event-stream' }
  }).then(async res => {
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error('射孔方案流式接口返回 ' + res.status + (txt ? '：' + txt.slice(0, 200) : ''))
    }
    if (!res.body) throw new Error('当前浏览器不支持流式响应')

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buf = ''
    let result = null
    let saw = 0

    const flush = block => {
      const lines = block.split(/\r?\n/)
      let event = 'message'
      let dataStr = ''
      for (const ln of lines) {
        if (ln.startsWith('event:')) event = ln.slice(6).trim()
        else if (ln.startsWith('data:')) dataStr += ln.slice(5).trim()
      }
      if (!dataStr) return
      let data = null
      try { data = JSON.parse(dataStr) } catch (e) { return }
      saw++
      if (event === 'result') {
        result = data
        handlers.onDone && handlers.onDone(data)
      } else if (event === 'error') {
        throw new Error(data.message || '射孔方案生成失败')
      } else {
        handlers.onEvent && handlers.onEvent(event, data)
      }
    }

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        flush(block)
      }
    }
    if (buf.trim()) flush(buf)

    if (!result) throw new Error('流式响应里没有拿到生成结果（收到 ' + saw + ' 条事件）')
    return result
  }).catch(e => {
    handlers.onError && handlers.onError(e)
    throw e
  })
}
