import request from '@/utils/request'

/**
 * 获取支持的压裂文档提取字段列表
 */
export function getFracturingFieldsApi() {
  return request({
    url: '/v1/fracturing-extraction/fields',
    method: 'get'
  })
}

/**
 * 仅执行提取，返回提取结果（不生成文档）
 * @param {MultipartFile} fracturingDoc - 压裂设计文档
 * @param {string} wellName - 井号（可选）
 */
export function extractFracturingOnlyApi(formData) {
  return request({
    url: '/v1/fracturing-extraction/extract-only',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 提取并生成压裂文档
 * @param {MultipartFile} fracturingDoc - 压裂设计文档
 * @param {string} wellName - 井号（可选）
 */
export function extractAndGenerateFracturingApi(formData) {
  return request({
    url: '/v1/fracturing-extraction/extract-and-generate',
    method: 'post',
    data: formData,
    responseType: 'blob',
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 检测文档冲突
 * @param {MultipartFile} fracturingDoc - 压裂设计文档
 * @param {string} wellName - 井号（可选）
 */
export function checkFracturingConflictsApi(formData) {
  return request({
    url: '/v1/fracturing-extraction/conflict-check',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/* ============================================================
 *  压裂设计智能体（内置模板骨架 + 内置数据来源规则，无需上传模板）
 * ============================================================ */

/**
 * 智能体信息（版本、字段数、章节数）
 */
export function getAgentInfoApi() {
  return request({
    url: '/v1/agent/fracturing/info',
    method: 'get'
  })
}

/**
 * 提取逻辑说明（中文可读版，按章节分组）
 *
 * 与 /info 的区别：/info 给的是机器视角的规则原文（tableHints / strategy 等字段名），
 * 本接口给的是「这条数据从哪来、怎么定位、怎么处理」，用于「查看提取逻辑」弹窗。
 * 返回结构：{ groups: [ { id, title, chapter, priority?, items: [ { key, label, type, origin, logic, locate?, filter?, formula?, note?, commentRef } ] } ] }
 */
export function getExtractLogicApi() {
  return request({
    url: '/v1/agent/fracturing/extract-logic',
    method: 'get'
  })
}

/**
 * 用源文档（地质设计）生成压裂工程设计正文 HTML
 *
 * 中文只能走 URL query：multipart 的文本字段会被 Tomcat 按 ISO-8859-1 解码成乱码。
 * @param {File} file 地质设计文档
 * @param {string} wellName 井号
 * @param {string} preTestVariant 压前测试（小压测试）泵注程序档位：「12方」/「15方」，不传后端用默认档
 * @param {string} wbWellId 工作台井号 ID：传了才会读「射孔方案」页保存的两张结构化表
 * @param {string} perforationMethod 射孔方式（= 文档类型）：「全程固井」/「半程固井」/「滑套压裂」
 */
export function generateByAgentApi(file, wellName, preTestVariant, wbWellId, perforationMethod) {
  const fd = new FormData()
  fd.append('file', file)
  const qs = []
  if (wellName) qs.push('wellName=' + encodeURIComponent(wellName))
  if (preTestVariant) qs.push('preTestVariant=' + encodeURIComponent(preTestVariant))
  if (wbWellId) qs.push('wbWellId=' + encodeURIComponent(wbWellId))
  if (perforationMethod) qs.push('perforationMethod=' + encodeURIComponent(perforationMethod))
  const q = qs.length ? '?' + qs.join('&') : ''
  return request({
    url: '/v1/agent/fracturing/generate' + q,
    method: 'post',
    data: fd,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  })
}

/**
 * 流式生成（SSE）：后端把「阶段 / 字段 / 逐章渲染」的真实进度逐条推回来。
 *
 * <p>不用 axios：项目拦截器只认 `{code:0}` 的 JSON，SSE 是 text/event-stream，
 * 会被它判成失败；用原生 fetch + ReadableStream 手工解析，边收边回调。
 *
 * @param {File} file     地质设计文档
 * @param {string} wellName 井号
 * @param {Object} handlers { onEvent(event, data), onDone(result), onError(err), signal }
 * @param {string} preTestVariant 压前测试（小压测试）泵注程序档位：「12方」/「15方」，不传后端用默认档
 * @param {string} wbWellId 工作台井号 ID：传了才会读「射孔方案」页保存的两张结构化表
 * @param {string} perforationMethod 射孔方式（= 文档类型）：「全程固井」/「半程固井」/「滑套压裂」
 * @returns {Promise<Object>} 最终结果（与 /generate 的 data 同结构）
 */
export function generateByAgentStreamApi(
  file, wellName, handlers = {}, preTestVariant, wbWellId, perforationMethod
) {
  const fd = new FormData()
  fd.append('file', file, file.name || 'geo.docx')
  // 中文参数一律走 query：multipart 文本字段会被 Tomcat 按 ISO-8859-1 解码成乱码
  const qs = []
  if (wellName) qs.push('wellName=' + encodeURIComponent(wellName))
  if (preTestVariant) qs.push('preTestVariant=' + encodeURIComponent(preTestVariant))
  if (wbWellId) qs.push('wbWellId=' + encodeURIComponent(wbWellId))
  if (perforationMethod) qs.push('perforationMethod=' + encodeURIComponent(perforationMethod))
  const q = qs.length ? '?' + qs.join('&') : ''
  const base = process.env.VUE_APP_BASE_API || '/api'

  return fetch(base + '/v1/agent/fracturing/generate/stream' + q, {
    method: 'POST',
    body: fd,
    signal: handlers.signal,
    headers: { Accept: 'text/event-stream' }
  }).then(async res => {
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error('智能体流式接口返回 ' + res.status + (txt ? '：' + txt.slice(0, 200) : ''))
    }
    if (!res.body) throw new Error('当前浏览器不支持流式响应')

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buf = ''
    let result = null
    let saw = 0

    // 一条 SSE 事件形如：  event: field\ndata: {...}\n\n
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
        throw new Error(data.message || '智能体执行失败')
      } else {
        handlers.onEvent && handlers.onEvent(event, data)
      }
    }

    // 边收边解析：\n\n 是事件分隔
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

/**
 * 智能体直接导出 docx（内置模板，无需上传模板）
 *
 * <p><b>wbWellId 必须传</b>：附图5（施工管柱）/ 附图6（井场布置）是「用户上传类」，
 * 后端要按 wbWellId + ATTACHMENT_TYPE 去 COMM_WB_ATTACHMENT 取图。
 * 不传的话，同一份源文档在页面上看得到这两张图，导出成 docx 却只剩一行占位文字。
 */
export function exportByAgentApi(file, wellName, perforationMethod, wbWellId) {
  const fd = new FormData()
  fd.append('file', file)
  const qs = []
  if (wellName) qs.push('wellName=' + encodeURIComponent(wellName))
  if (perforationMethod) qs.push('perforationMethod=' + encodeURIComponent(perforationMethod))
  if (wbWellId) qs.push('wbWellId=' + encodeURIComponent(wbWellId))
  const q = qs.length ? '?' + qs.join('&') : ''
  return request({
    url: '/v1/agent/fracturing/export' + q,
    method: 'post',
    data: fd,
    responseType: 'blob',
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  })
}
