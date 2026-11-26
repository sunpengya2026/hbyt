import request from '@/utils/request'

/**
 * 获取井列表（分页 / keyword 搜索）
 * @param {Object} params { keyword, page, pageSize }
 * @returns {Promise} data = { total, page, pageSize, list: [] }
 */
export function getWellList(params) {
  return request({
    url: '/v1/wells',
    method: 'get',
    params
  })
}

/**
 * 井号联想：从主数据 CD_WELL 模糊匹配井号（工作台建井号用）
 * @param {String} keyword 井名关键字
 * @param {Number} limit   返回条数上限
 * @returns {Promise} data = [{ wellName, commonName, legalName, wellId, block, wellType, wellPurpose, exact }]
 */
export function suggestWellNames(keyword, limit = 20) {
  return request({
    url: '/v1/wells/suggest',
    method: 'get',
    params: { keyword, limit }
  })
}

/**
 * 按井号精确查 CD_WELL 主数据（回填井型/井别/区块）
 * @param {String} wellName
 */
export function getWellMaster(wellName) {
  return request({
    url: '/v1/wells/master',
    method: 'get',
    params: { wellName }
  })
}

/**
 * 获取所有井（不分页，数据量大慎用）
 * @param {Object} params { keyword }
 */
export function getAllWells(params) {
  return request({
    url: '/v1/wells/all',
    method: 'get',
    params
  })
}

/**
 * 获取井详情
 * @param {String} wellId
 */
export function getWellDetail(wellId) {
  return request({
    url: `/v1/wells/${wellId}`,
    method: 'get'
  })
}

/**
 * 搜索井
 * @param {String} keyword
 */
export function searchWell(keyword) {
  return request({
    url: '/v1/wells/search',
    method: 'get',
    params: { keyword }
  })
}

/**
 * 提取井的 API 数据
 * @param {String} wellId
 */
export function getWellApiData(wellId) {
  return request({
    url: `/v1/wells/${wellId}/api-data`,
    method: 'get'
  })
}

/**
 * 获取邻井数据
 * @param {String} wellId
 */
export function getNeighborData(wellId) {
  return request({
    url: `/v1/wells/${wellId}/neighbor-data`,
    method: 'get'
  })
}

/**
 * 获取技技术标准
 * @param {String} wellId
 */
export function getTechnicalStandards(wellId) {
  return request({
    url: `/v1/wells/${wellId}/standards`,
    method: 'get'
  })
}

/**
 * 开始文档生成
 * @param {String} wellId
 */
export function startGeneration(wellId) {
  return request({
    url: `/v1/reports/generate/${wellId}`,
    method: 'post'
  })
}

/**
 * 获取生成状态
 * @param {String} wellId
 */
export function getGenerationStatus(wellId) {
  return request({
    url: `/v1/reports/status/${wellId}`,
    method: 'get'
  })
}

/* ============================================================
 *  工作台「对象树」CRUD（后端 COMM_WB_FOLDER / COMM_WB_WELL）
 * ============================================================ */

/**
 * 读取整棵对象树
 * @param {Object} params { userId }
 * @returns {Promise} data = { folders: [], wells: [] }
 */
export function getObjectTree(params) {
  return request({
    url: '/v1/workbench/tree',
    method: 'get',
    params
  })
}

/**
 * 新建文件夹
 * @param {Object} data { folderName, parentId, remark, userId }
 */
export function createFolder(data) {
  return request({
    url: '/v1/workbench/folder',
    method: 'post',
    data
  })
}

/**
 * 重命名文件夹
 * @param {String} folderId
 * @param {Object} data { folderName, userId }
 */
export function renameFolder(folderId, data) {
  return request({
    url: `/v1/workbench/folder/${folderId}`,
    method: 'put',
    data
  })
}

/**
 * 删除文件夹（子文件夹级联，井号上提到父级）
 * @param {String} folderId
 * @param {Object} params { userId }
 */
export function deleteFolder(folderId, params) {
  return request({
    url: `/v1/workbench/folder/${folderId}`,
    method: 'delete',
    params
  })
}

/**
 * 新建井号
 * @param {Object} data { wellName, folderId, wellId, wellBlock, wellType, wellStatus, wellSource, remark, userId }
 */
export function createWbWell(data) {
  return request({
    url: '/v1/workbench/well',
    method: 'post',
    data
  })
}

/**
 * 编辑井号
 * @param {String} wbWellId
 * @param {Object} data { wellName, folderId, wellBlock, wellType, remark, userId }
 */
export function updateWbWell(wbWellId, data) {
  return request({
    url: `/v1/workbench/well/${wbWellId}`,
    method: 'put',
    data
  })
}

/**
 * 删除井号
 * @param {String} wbWellId
 * @param {Object} params { userId }
 */
export function deleteWbWell(wbWellId, params) {
  return request({
    url: `/v1/workbench/well/${wbWellId}`,
    method: 'delete',
    params
  })
}

/**
 * 获取区块下拉选项（关联 COMM_CODING_SORT_DETAIL）
 * @param {Object} params { keyword }
 */
export function getBlockOptions(params) {
  return request({
    url: '/v1/workbench/blocks',
    method: 'get',
    params
  })
}

/**
 * 获取射孔方式枚举
 */
export function getPerforationMethods() {
  return request({
    url: '/v1/workbench/perforation-methods',
    method: 'get'
  })
}

/**
 * 获取工作台井号详情（区块名称已由后端关联 CODING_NAME 解析）
 * @param {String} wbWellId
 * @param {Object} params { userId }
 * @returns {Promise} data = { wbWellId, wellName, blockName, perforationMethod, ... }
 */
export function getWbWellDetail(wbWellId, params) {
  return request({
    url: `/v1/workbench/well-detail/${wbWellId}`,
    method: 'get',
    params
  })
}

/* ============================================================
 *  工作台附件管理
 * ============================================================ */

/**
 * 上传附件
 * @param {FormData} formData 包含 file / wbWellId / attachmentType / userId
 */
export function uploadAttachment(formData) {
  return request({
    url: '/v1/workbench/attachments',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 获取井号下附件列表
 * @param {String} wbWellId
 */
export function getAttachments(wbWellId) {
  return request({
    url: `/v1/workbench/attachments/${wbWellId}`,
    method: 'get'
  })
}

/**
 * 删除附件
 * @param {String} attachmentId
 */
export function deleteAttachment(attachmentId) {
  return request({
    url: `/v1/workbench/attachments/${attachmentId}`,
    method: 'delete'
  })
}

/**
 * 下载附件 URL（直接返回地址，前端 window.open 下载）
 * @param {String} attachmentId
 */
export function downloadAttachmentUrl(attachmentId) {
  const base = process.env.VUE_APP_BASE_API || '/api'
  return `${base}/v1/workbench/attachments/${attachmentId}/download`
}

/**
 * 按类型获取最新附件
 * @param {String} wbWellId
 * @param {String} attachmentType
 */
export function getAttachmentByType(wbWellId, attachmentType) {
  return request({
    url: `/v1/workbench/attachments/${wbWellId}/${attachmentType}`,
    method: 'get'
  })
}

/**
 * 下载附件并拿到二进制（blob）。
 *
 * 与 downloadAttachmentUrl 的区别：
 *   - downloadAttachmentUrl 只给地址，前端 window.open 让浏览器存盘；
 *   - 这里要的是内容本身——泵注程序页需要把工作台上传的泵注表读成 ArrayBuffer
 *     再交给 xlsx 解析，所以必须走 responseType: 'blob'。
 *
 * @param {String} attachmentId
 * @returns {Promise<Blob>}
 */
export function downloadAttachmentBlob(attachmentId) {
  return request({
    url: `/v1/workbench/attachments/${attachmentId}/download`,
    method: 'get',
    responseType: 'blob'
  })
}
