import request from '@/utils/request'

/**
 * RagFlow 知识库接口。
 *
 * <p>后端统一代理 RagFlow（api-key 认证 + 内网证书信任），前端不需要也不应该
 * 直接持有 RagFlow 的账号密码与 api-key。
 */

/* ============================================================
 *  知识库
 * ============================================================ */

/**
 * 知识库列表
 */
export function getRagDatasetsApi() {
  return request({
    url: '/v1/ragflow/datasets',
    method: 'get'
  })
}

/**
 * 工作台默认知识库（压裂知识库）
 */
export function getRagWorkbenchDatasetApi() {
  return request({
    url: '/v1/ragflow/workbench/dataset',
    method: 'get'
  })
}

/* ============================================================
 *  文档
 * ============================================================ */

/**
 * 知识库文档列表
 * @param {string} datasetId 知识库 ID
 * @param {number} page 页码
 * @param {number} pageSize 每页条数
 */
export function getRagDocumentsApi(datasetId, page = 1, pageSize = 50) {
  return request({
    url: `/v1/ragflow/datasets/${datasetId}/documents`,
    method: 'get',
    params: { page, pageSize }
  })
}

/**
 * 上传文档到知识库
 * @param {string} datasetId 知识库 ID
 * @param {File} file 文件
 */
export function uploadRagDocumentApi(datasetId, file) {
  const fd = new FormData()
  fd.append('file', file)
  return request({
    url: `/v1/ragflow/datasets/${datasetId}/documents`,
    method: 'post',
    data: fd,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000
  })
}

/**
 * 在线预览文档（后端把 docx 解析成 HTML）
 * @param {string} datasetId 知识库 ID
 * @param {string} documentId 文档 ID
 * @param {string} fileName 文件名
 * @param {string} wellName 井号
 */
export function previewRagDocumentApi(datasetId, documentId, fileName, wellName) {
  return request({
    url: `/v1/ragflow/datasets/${datasetId}/documents/${documentId}/preview`,
    method: 'get',
    params: { fileName, wellName },
    timeout: 300000
  })
}

/**
 * 直接用知识库中的文档生成压裂设计正文 HTML
 *
 * ⚠️ 2026-11-15 业务要求把知识库文档列表「操作」列的「生成设计」按钮去掉了，
 *    因此本函数**当前没有调用方**。定义保留：后端
 *    `POST /v1/ragflow/datasets/{id}/documents/{docId}/generate` 仍然可用，
 *    以后要恢复入口时直接在这里接上即可，不必重新写接口。
 *
 * @param {string} datasetId 知识库 ID
 * @param {string} documentId 文档 ID
 * @param {string} fileName 文件名
 * @param {string} wellName 井号
 */
export function generateFromRagDocumentApi(datasetId, documentId, fileName, wellName) {
  return request({
    url: `/v1/ragflow/datasets/${datasetId}/documents/${documentId}/generate`,
    method: 'post',
    params: { fileName, wellName },
    timeout: 600000
  })
}

/**
 * 删除知识库文档
 * @param {string} datasetId 知识库 ID
 * @param {Array<string>} ids 文档 ID 列表
 */
export function deleteRagDocumentsApi(datasetId, ids) {
  return request({
    url: `/v1/ragflow/datasets/${datasetId}/documents`,
    method: 'delete',
    params: { ids: ids.join(',') }
  })
}

/**
 * 下载知识库中的原始文件（返回 Blob）
 */
export function downloadRagDocumentApi(datasetId, documentId, fileName) {
  return request({
    url: `/v1/ragflow/datasets/${datasetId}/documents/${documentId}/download`,
    method: 'get',
    params: { fileName },
    responseType: 'blob',
    timeout: 300000
  })
}

/* ============================================================
 *  智能问答
 * ============================================================ */

/**
 * 知识库智能问答。
 *
 * 参数走 JSON body —— 中文问题不能用 query 传（Tomcat 按 ISO-8859-1 解码会乱码），
 * 也不能走 multipart 文本字段，必须 JSON。
 *
 * @param {Object} payload
 * @param {string} payload.datasetId 知识库 ID（可空）
 * @param {string} payload.question 问题
 * @param {Array<{role:string, content:string}>} payload.history 历史对话
 */
export function askKnowledgeBaseApi(payload) {
  return request({
    url: '/v1/ragflow/qa/ask',
    method: 'post',
    data: payload,
    timeout: 300000
  })
}

/**
 * 知识库问答可用性探针
 */
export function getRagQaHealthApi() {
  return request({
    url: '/v1/ragflow/qa/health',
    method: 'get',
    timeout: 30000
  })
}

/**
 * 知识库推荐问题（按库里真实内容动态生成，替代写死的示例问题）
 * @param {Object} params
 * @param {string} [params.datasetId] 指定知识库
 * @param {boolean} [params.allDatasets] true = 跨全部知识库
 * @param {number} [params.limit] 条数，默认 4
 */
export function getQaSuggestionsApi(params) {
  return request({
    url: '/v1/ragflow/qa/suggestions',
    method: 'get',
    params,
    timeout: 60000
  })
}

/** 全部可见知识库（跨库问答时用于展示范围） */
export function getAllDatasetIdsApi() {
  return request({
    url: '/v1/ragflow/datasets',
    method: 'get',
    timeout: 30000
  })
}
