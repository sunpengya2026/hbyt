import request from '@/utils/request'

/**
 * 获取井列表
 */
export function getWellList(params) {
  return request({
    url: '/v1/wells',
    method: 'get',
    params
  })
}

/**
 * 获取井详情
 */
export function getWellById(wellId) {
  return request({
    url: `/v1/wells/${wellId}`,
    method: 'get'
  })
}

/**
 * 搜索井
 */
export function searchWells(keyword) {
  return request({
    url: '/v1/wells/search',
    method: 'get',
    params: { keyword }
  })
}

/**
 * 提取井的API数据
 */
export function extractWellApiData(wellId) {
  return request({
    url: `/v1/wells/${wellId}/api-data`,
    method: 'get'
  })
}

/**
 * 获取邻井数据
 */
export function getNeighborData(wellId) {
  return request({
    url: `/v1/wells/${wellId}/neighbor-data`,
    method: 'get'
  })
}

/**
 * 获取技术标准
 */
export function getTechnicalStandards(wellId) {
  return request({
    url: `/v1/wells/${wellId}/standards`,
    method: 'get'
  })
}

/**
 * 获取所有数据
 */
export function getAllWellData(wellId) {
  return request({
    url: `/v1/wells/${wellId}/all-data`,
    method: 'get'
  })
}

/**
 * 开始文档生成
 */
export function startGeneration(wellId) {
  return request({
    url: `/v1/reports/generate/${wellId}`,
    method: 'post'
  })
}

/**
 * 完成文档生成
 */
export function completeGeneration(wellId, data) {
  return request({
    url: `/v1/reports/complete/${wellId}`,
    method: 'post',
    data
  })
}

/**
 * 获取生成状态
 */
export function getGenerationStatus(wellId) {
  return request({
    url: `/v1/reports/status/${wellId}`,
    method: 'get'
  })
}
