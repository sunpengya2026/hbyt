import request from '@/utils/request'
import { getCurrentPerforationTables } from './perforation-table'

/**
 * 泵注程序结构化表 API（保存 / 查询 / 历史 / 删除）
 *
 * 后端 context-path = /api，axios 的 baseURL 也是 /api（见 .env.development），
 * 所以这里一律写 /v1/xxx，不能写 /api/v1/xxx，否则会拼成 /api/api/v1/...
 */
const BASE_URL = '/v1/agent/pump/tables'

/**
 * 保存一版泵注程序（全部段，一次事务）。
 *
 * 同井每次保存 VERSION_NO + 1，上一版置历史。
 * ⚠️ 引用段（refStageNo 非空）的 rows 会被后端强制清空 —— 明细由被引用段提供。
 *
 * @param {Object} data {
 *   wbWellId, wellName, maxRate, maxRatio, padFluid, carryFluid, proppant, sourceType,
 *   stages: [{
 *     stageNo, refStageNo, plugDepth, startDepth, endDepth,
 *     rows: [{ rowNo, stageName, stageGroup, fluid, ratio, rate, note, proppant }]
 *   }]
 * }
 */
export function savePumpTable(data) {
  return request({
    url: `${BASE_URL}/save`,
    method: 'post',
    data
  })
}

/**
 * 查某井当前版本的泵注程序。
 * 没有保存过时 data 为 null（不是报错），调用方据此判断该走公式派生。
 * @param {String} wbWellId
 */
export function getCurrentPumpTable(wbWellId) {
  return request({
    url: `${BASE_URL}/current`,
    method: 'get',
    params: { wbWellId }
  })
}

/** 查某井的保存历史（仅表头） */
export function listPumpTableHistory(wbWellId) {
  return request({
    url: `${BASE_URL}/history`,
    method: 'get',
    params: { wbWellId }
  })
}

/** 查单个版本的完整内容 */
export function getPumpTable(tableId) {
  return request({
    url: `${BASE_URL}/${tableId}`,
    method: 'get'
  })
}

/** 逻辑删除一次保存 */
export function deletePumpTable(tableId, userId) {
  return request({
    url: `${BASE_URL}/${tableId}`,
    method: 'delete',
    params: { userId }
  })
}

/**
 * 从分段射孔方案结构化表提取「段骨架」：段号 + 桥塞深度 + 起止深度。
 *
 * 为什么桥塞深度取 packerPosition：
 *   工程口径是「桥塞位置 = 分段射孔方案中的封隔器位置」（见 wellModules.js）。
 *   段级 packerPosition 优先，取不到再回落簇级明细（历史数据只落过簇级）。
 *
 * ⚠️ 不再从 sessionStorage.perforationAgentResult 取 —— 射孔页从来不写那个 key，
 *    之前那条链路是空转的，桥塞深度恒为 0，顶替液退化成 2 m³。
 *
 * @param {String} wbWellId
 * @returns {Promise<Array<{stageNo, plugDepth, startDepth, endDepth}>>}
 */
export async function fetchPerforationStages(wbWellId) {
  if (!wbWellId) return []
  const res = await getCurrentPerforationTables(wbWellId)
  const list = (res && res.data) || []
  const seg = list.find(t => t && t.tableType === 'SEG_PLAN')
  const crush = list.find(t => t && t.tableType === 'CRUSH_IDX')

  // 簇级封隔器位置按段兜底：本井簇明细为空时这段不起作用，但老数据能救回来
  const packerByStage = {}
  const crushRows = (crush && crush.crushIdx) || []
  crushRows.forEach(c => {
    if (!c || c.stageNo == null) return
    const v = Number(c.packerPosition)
    if (!isFinite(v) || v <= 0) return
    const cur = packerByStage[c.stageNo]
    // 同段多簇取最小的那个 = 最靠井口的那簇，与「本段桥塞」位置口径一致
    if (cur == null || v < cur) packerByStage[c.stageNo] = v
  })

  const segRows = (seg && seg.segPlan) || []
  if (!segRows.length) return []

  return segRows
    .filter(s => s && s.stageNo != null)
    .sort((a, b) => Number(a.stageNo) - Number(b.stageNo))
    .map(s => {
      const segPacker = Number(s.packerPosition)
      const plug = isFinite(segPacker) && segPacker > 0
        ? segPacker
        : (packerByStage[s.stageNo] || null)
      return {
        stageNo: Number(s.stageNo),
        plugDepth: plug,
        startDepth: s.startDepth == null ? null : Number(s.startDepth),
        endDepth: s.endDepth == null ? null : Number(s.endDepth)
      }
    })
}

/**
 * 取本井「地质设计压裂点参数表」的段数 —— 泵注程序段数的**默认来源**。
 *
 * 业务口径：地质设计里压裂点参数表写了几段（按「分段」列去重），就该生成几段泵注程序。
 * 地层有几个改造段是地质设计定死的，不该被「有没有做过射孔方案」左右。
 *
 * 返回 data = {
 *   stageCount, stages: [], sourceDoc, sourceDocId, sourceDocVersion,
 *   tableTitle, message, fromLocalCache
 * }
 * stageCount = 0 表示没取到（没传地质设计 / 表里没这口井 / 没有分段列），
 * 此时 message 是原因，调用方应回落到射孔方案的段数，**不要当成 0 段**。
 *
 * ⚠️ 只传 wbWellId，不传井名：井名是中文，经 qiankun 会被二次编码，
 *    后端按 wbWellId 自己从库里查，筛行用的井名与工作台列表同源。
 *
 * @param {String} wbWellId 工作台井号 ID
 */
export function fetchGeologicalStageCount(wbWellId) {
  if (!wbWellId) return Promise.resolve({ data: null })
  return request({
    url: '/v1/agent/pump/stage-count',
    method: 'get',
    params: { wbWellId }
  })
}

/* ============================================================
 *  泵注程序「按段预览 / 导出」——数据源是工程设计文档第六章
 * ============================================================ */
/**
 * 预览本井工程设计文档「六、施工泵注程序」整章（按段返回）。
 *
 * 与 /tables/current 的差别：
 *   - current 读的是**结构化保存结果**（用户在泵注页确认过的版本）；
 *   - 这里读的是**生成文档原文**，用于「还没进泵注页、只想看看文档里写了什么」。
 *
 * 返回 data = { sourceFileName, tableCount, message,
 *   stages: [{ seq, title, stageNo, plugDepth, sheetName, headers: [], rows: [[...]] }] }
 *
 * @param {String} wbWellId 工作台井号 ID
 * @param {String} [docId] 指定文档，不传取本井最新生成版本
 */
export function previewPumpProgram(wbWellId, docId) {
  return request({
    url: '/v1/agent/pump/preview',
    method: 'get',
    params: { wbWellId, docId }
  })
}

/**
 * 导出泵注程序 Excel（一段一个 sheet）的请求地址。
 *
 * 走地址而不是 request()：下载要交给浏览器自己接管，
 * 才能用上后端 Content-Disposition 里的中文文件名。
 *
 * @param {String} wbWellId
 * @param {String} [wellName] 仅用于文件名与表头
 * @param {String} [docId]
 */
export function pumpProgramExportUrl(wbWellId, wellName, docId) {
  const base = process.env.VUE_APP_BASE_API || '/api'
  const parts = ['wbWellId=' + encodeURIComponent(wbWellId || '')]
  if (wellName) parts.push('wellName=' + encodeURIComponent(wellName))
  if (docId) parts.push('docId=' + encodeURIComponent(docId))
  return base + '/v1/agent/pump/export.xlsx?' + parts.join('&')
}

/**
 * 导出「泵注功能页保存的那一版」泵注程序（一段一个 sheet）。
 *
 * ⚠️ 与上面的 pumpProgramExportUrl 是两个不同的数据源，别混用：
 *   - pumpProgramExportUrl → /v1/agent/pump/export.xlsx
 *       从**工程设计文档第六章**现场解析；还没生成文档时为空；
 *   - 本函数 → /v1/agent/pump/tables/export.xlsx
 *       从**结构化表 COMM_WB_PUMP_***读用户保存/上传的版本，是单井工作台该用的那个。
 *
 * @param {String} wbWellId 工作台井号 ID
 * @param {String} [wellName] 仅用于文件名与标题行
 */
export function pumpTableExportUrl(wbWellId, wellName) {
  const base = process.env.VUE_APP_BASE_API || '/api'
  const parts = ['wbWellId=' + encodeURIComponent(wbWellId || '')]
  if (wellName) parts.push('wellName=' + encodeURIComponent(wellName))
  return base + '/v1/agent/pump/tables/export.xlsx?' + parts.join('&')
}
