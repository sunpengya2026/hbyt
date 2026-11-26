import request from '@/utils/request'

// 知识库相关接口

/**
 * 获取知识列表
 */
export function getKnowledgeList(params) {
  return request({
    url: '/api/v1/knowledge',
    method: 'get',
    params
  })
}

/**
 * 获取知识详情
 */
export function getKnowledgeDetail(knowledgeId) {
  return request({
    url: `/api/v1/knowledge/${knowledgeId}`,
    method: 'get'
  })
}

/**
 * 添加知识
 */
export function addKnowledge(data) {
  return request({
    url: '/api/v1/knowledge',
    method: 'post',
    data
  })
}

/**
 * 更新知识
 */
export function updateKnowledge(knowledgeId, data) {
  return request({
    url: `/api/v1/knowledge/${knowledgeId}`,
    method: 'put',
    data
  })
}

/**
 * 删除知识
 */
export function deleteKnowledge(knowledgeId) {
  return request({
    url: `/api/v1/knowledge/${knowledgeId}`,
    method: 'delete'
  })
}

/**
 * 搜索知识
 */
export function searchKnowledge(query, params) {
  return request({
    url: `/api/v1/knowledge/search`,
    method: 'get',
    params: { query, ...params }
  })
}

/**
 * 批量导入知识
 */
export function batchImportKnowledge(data) {
  return request({
    url: '/api/v1/knowledge/batch-import',
    method: 'post',
    data
  })
}

/**
 * 获取知识分类
 */
export function getKnowledgeCategories() {
  return request({
    url: '/api/v1/knowledge/categories',
    method: 'get'
  })
}
